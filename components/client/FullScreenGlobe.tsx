"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import GlobeTooltip from "./GlobeTooltip";
import type { ProvidersResponse } from "@/app/data/models";

type ApiProvider = {
  provider: {
    id: string;
    pubkey: string;
    created_at: number;
    kind: number;
    d_tag: string;
    endpoint_url: string;
    endpoint_urls: string[];
    name: string;
    description: string;
    contact: string | null;
    pricing_url: string | null;
    mint_url: string;
    version: string;
    supported_models: string[];
    content: string;
  };
  health?: {
    status_code?: number;
    endpoint?: string;
    json?: any;
  };
};

type ProviderLocation = {
  id: string;
  name: string;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
  type: 'Routstr Node';
  status: 'online' | 'offline' | 'maintenance';
  description: string;
  createdAt: number;
  providerId: string;
  pubkey: string;
  endpoints: { http: string[]; tor: string[] };
  models: string[];
  mint?: string;
  version: string;
};

const geoCache = new Map<string, { lat: number; lng: number }>();

function djb2Hash(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) hash = (hash * 33) ^ input.charCodeAt(i);
  return hash >>> 0;
}

function hashToLatLng(input: string): { lat: number; lng: number } {
  const h = djb2Hash(input);
  const lat = ((h % 12000) / 100) - 60; // -60..60 to avoid poles
  const lng = (((Math.floor(h / 12000)) % 36000) / 100) - 180; // -180..180
  return { lat, lng };
}

function extractHostname(input: string): string | null {
  try {
    return new URL(input).hostname;
  } catch {
    // If it's already a hostname without scheme
    const match = input.match(/^[a-z0-9.-]+$/i);
    return match ? match[0] : null;
  }
}

async function geolocateEndpoint(endpoint: string): Promise<{ lat: number; lng: number } | null> {
  const host = extractHostname(endpoint);
  if (!host) return null;
  
  // Skip localhost, private IPs, and .onion domains
  if (host === 'localhost' || host.startsWith('127.') || host.startsWith('192.168.') || 
      host.startsWith('10.') || host.endsWith('.onion') || host.startsWith('172.')) {
    return null;
  }
  
  const cached = geoCache.get(host);
  if (cached) return cached;
  
  try {
    // Use multiple fallback services for 100% accuracy
    const services = [
      {
        url: `http://ip-api.com/json/${encodeURIComponent(host)}?fields=status,lat,lon`,
        parser: (data: any) => data.status === 'success' ? { lat: data.lat, lng: data.lon } : null
      },
      {
        url: `https://ipapi.co/${encodeURIComponent(host)}/json/`,
        parser: (data: any) => data.latitude && data.longitude ? { lat: parseFloat(data.latitude), lng: parseFloat(data.longitude) } : null
      },
      {
        url: `https://ipwho.is/${encodeURIComponent(host)}`,
        parser: (data: any) => data.success && data.latitude && data.longitude ? { lat: parseFloat(data.latitude), lng: parseFloat(data.longitude) } : null
      }
    ];
    
    for (const service of services) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const resp = await fetch(service.url, { 
          signal: controller.signal,
          headers: { 'Accept': 'application/json', 'User-Agent': 'routstr-globe/1.0' },
          mode: 'cors'
        });
        
        clearTimeout(timeoutId);
        
        if (!resp.ok) continue;
        
        const data = await resp.json();
        const coords = service.parser(data);
        
        if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number' && 
            !isNaN(coords.lat) && !isNaN(coords.lng) && 
            coords.lat >= -90 && coords.lat <= 90 && coords.lng >= -180 && coords.lng <= 180) {
          geoCache.set(host, coords);
          return coords;
        }
      } catch (e) {
        // Service failed, try next one
        continue;
      }
    }
  } catch (e) {
    // All services failed
  }
  
  return null;
}

async function fetchCountriesGeoJson(): Promise<any> {
  const res = await fetch(
    "https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson"
  );
  return res.json();
}

async function fetchProviders(): Promise<ApiProvider[]> {
  try {
    const res = await fetch("https://staging.routstr.com/v1/providers/?include_json=true");
    const data = await res.json();
    const list: ApiProvider[] = data.providers || [];
    // Include all providers; positioning will fallback when needed
    return list;
  } catch (error) {
    console.error("Failed to fetch providers:", error);
    return [];
  }
}

function transformApiProvider(apiProvider: ApiProvider): ProviderLocation | null {
  // Parse endpoint URLs to separate HTTP and Tor
  const httpEndpoints: string[] = [];
  const torEndpoints: string[] = [];
  
  (apiProvider.provider.endpoint_urls || []).forEach((url) => {
    if (typeof url !== 'string') return;
    if (url.includes('.onion')) torEndpoints.push(url);
    else httpEndpoints.push(url);
  });

  // Determine a stable fallback coordinate based on endpoint/pubkey/id
  const primaryEndpoint = (apiProvider as any)?.health?.json?.http_url 
    || apiProvider.provider.endpoint_url 
    || httpEndpoints[0] 
    || torEndpoints[0];
  const baseKey = typeof primaryEndpoint === 'string' && primaryEndpoint.length > 0
    ? primaryEndpoint
    : (apiProvider.provider.pubkey || apiProvider.provider.id || apiProvider.provider.d_tag);
  const fallback = hashToLatLng(String(baseKey || `${apiProvider.provider.id}-seed`));

  let lat: number = fallback.lat;
  let lng: number = fallback.lng;
  let city: string | undefined;
  let country: string | undefined;

  // Prefer specific locations for known cases
  if (apiProvider.provider.name && apiProvider.provider.name.toLowerCase().includes('staging')) {
    lat = 52.52;
    lng = 13.405;
    city = "Berlin";
    country = "Germany";
  } else if (apiProvider.provider.endpoint_url && apiProvider.provider.endpoint_url.includes('localhost')) {
    const localProviders = [
      { lat: 37.7749, lng: -122.4194, city: "San Francisco", country: "United States" },
      { lat: 51.5074, lng: -0.1278, city: "London", country: "United Kingdom" },
      { lat: 35.6762, lng: 139.6503, city: "Tokyo", country: "Japan" },
    ];
    const index = apiProvider.provider.id.charCodeAt(0) % localProviders.length;
    const location = localProviders[index];
    lat = location.lat;
    lng = location.lng;
    city = location.city;
    country = location.country;
  }

  // Prefer models from health.json if available
  const modelsFromHealth: string[] = Array.isArray((apiProvider as any)?.health?.json?.models)
    ? ((apiProvider as any).health.json.models as Array<{ id?: string } | string>).map((m: any) => typeof m === 'string' ? m : m?.id).filter(Boolean)
    : [];

  return {
    id: apiProvider.provider.id,
    name: apiProvider.provider.name,
    city,
    country,
    lat,
    lng,
    type: 'Routstr Node',
    status: 'online',
    description: apiProvider.provider.description,
    createdAt: apiProvider.provider.created_at,
    providerId: apiProvider.provider.d_tag,
    pubkey: apiProvider.provider.pubkey,
    endpoints: {
      http: httpEndpoints,
      tor: torEndpoints,
    },
    models: modelsFromHealth.length > 0 ? modelsFromHealth : (apiProvider.provider.supported_models || []),
    mint: apiProvider.provider.mint_url || undefined,
    version: apiProvider.provider.version,
  };
}

export default function FullScreenGlobe() {
  const Globe = useMemo(() => {
    if (typeof window === "undefined") return null;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("react-globe.gl").default as any;
  }, []);

  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const size = useMemo(() => {
    return dimensions.height; // size globe by viewport height only
  }, [dimensions]);
  const [hexData, setHexData] = useState<any[]>([]);
  const [ringsData, setRingsData] = useState<any[]>([]);
  const [hoveredProvider, setHoveredProvider] = useState<ProviderLocation | null>(null);
  const [providers, setProviders] = useState<ProviderLocation[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ProviderLocation | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<{ x: number; y: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let raf: number | null = null;
    const onResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    onResize();
    window.addEventListener("resize", onResize);
    
    // Fetch data
    fetchCountriesGeoJson().then((geo) => setHexData(geo.features));
    // Fetch providers
    fetchProviders().then(async (apiProviders) => {
      const transformedProviders = apiProviders
        .map(transformApiProvider)
        .filter((p): p is ProviderLocation => p !== null);

      // Show immediate fallback positions
      setProviders(transformedProviders);
      setRingsData(
        transformedProviders.map((p) => ({
          lat: p.lat,
          lng: p.lng,
          maxRadius: 4,
          propagationSpeed: 4,
          repeatPeriod: 1400,
          provider: p,
        }))
      );

      // Geolocate endpoints like landing page globe and update positions
      const geolocated = await Promise.all(
        transformedProviders.map(async (p) => {
          const endpoint = (apiProviders.find(ap => ap.provider.id === p.id) as any)?.health?.json?.http_url
            || p.endpoints.http[0]
            || p.endpoints.tor[0]
            || (apiProviders.find(ap => ap.provider.id === p.id)?.provider.endpoint_url ?? null);
          if (endpoint) {
            try {
              const coords = await geolocateEndpoint(endpoint);
              if (coords) {
                return { ...p, lat: coords.lat, lng: coords.lng } as ProviderLocation;
              }
            } catch {}
          }
          return p;
        })
      );

      setProviders(geolocated);
      setRingsData(
        geolocated.map((p) => ({
          lat: p.lat,
          lng: p.lng,
          maxRadius: 4,
          propagationSpeed: 4,
          repeatPeriod: 1400,
          provider: p,
        }))
      );
    }).catch((e) => {
      // fallback to no points if fetch fails
      setProviders([]);
      setRingsData([]);
      // eslint-disable-next-line no-console
      console.error('Globe provider fetch failed', e);
    });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // No from-to animation; keep camera stable and interactive
  useEffect(() => {
    if (!globeRef.current) return;
    const camera = globeRef.current.camera();
    camera.position.set(0, 0, -240); // slightly closer for a larger globe
    camera.lookAt(0, 0, 0);
    
    globeRef.current.pointOfView({ lat: 50, lng: 10, altitude: 1.8 });
    
    // Enable auto-rotation
    const controls = globeRef.current.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = -1; // Slow rotation speed in opposite direction
    controls.update();
  }, [Globe]);

  const globeMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: 0xffffff }), []);

  const handlePointClick = useCallback((point: ProviderLocation | null, event: MouseEvent) => {
    if (!point || !globeRef.current) return;
    try { event.stopPropagation(); } catch {}
    setSelectedProvider(point);
    setSelectedPosition({ x: event.clientX, y: event.clientY });
    try {
      const controls = globeRef.current.controls();
      controls.autoRotate = false;
      controls.update();
    } catch {}
  }, []);

  const handleGlobeClick = useCallback(() => {
    if (!globeRef.current) return;
    setSelectedProvider(null);
    setSelectedPosition(null);
    try {
      const controls = globeRef.current.controls();
      controls.autoRotate = true;
      controls.update();
    } catch {}
  }, []);

  const handlePointHover = useCallback((point: ProviderLocation | null) => {
    setHoveredProvider(point);
    try {
      const controls = globeRef.current?.controls();
      if (!controls) return;
      // Pause rotation on hover; resume only if nothing is selected
      if (point) {
        controls.autoRotate = false;
      } else if (!selectedProvider) {
        controls.autoRotate = true;
      }
      controls.update();
    } catch {}
  }, [selectedProvider]);

  // Dismiss tooltip when clicking anywhere outside the tooltip element
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!selectedProvider) return;
      const tip = tooltipRef.current;
      if (tip && tip.contains(e.target as Node)) return;
      handleGlobeClick();
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [selectedProvider, handleGlobeClick]);

  if (!Globe) return null;

  return (
    <div ref={containerRef} className="w-full h-full bg-black flex items-center justify-center">
      <Globe
        ref={globeRef}
        height={size}
        globeMaterial={globeMaterial}
        hexPolygonsData={hexData}
        hexPolygonLabel={() => ''}
        hexPolygonResolution={3}
        hexPolygonMargin={0.3}
        hexPolygonUseDots
        hexPolygonColor={() => "rgba(128, 128, 128, 0.2)"}
        // Provider points
        pointsData={providers}
        pointLabel={() => ''}
        pointLat="lat"
        pointLng="lng"
        pointColor={(point: ProviderLocation) => {
          switch (point.status) {
            case 'online': return '#10b981';
            case 'offline': return '#ef4444';
            case 'maintenance': return '#f59e0b';
            default: return '#6b7280';
          }
        }}
        pointAltitude={0.02}
        pointRadius={0.5}
        onPointClick={handlePointClick}
        onPointHover={handlePointHover}
        onGlobeClick={handleGlobeClick}
        // Pulsing rings
        ringsData={ringsData}
        ringColor={(ring: any) => {
          if (!ring.provider) return "rgba(198, 85, 206, .8)";
          switch (ring.provider.status) {
            case 'online': return "rgba(16, 185, 129, 0.8)";
            case 'offline': return "rgba(239, 68, 68, 0.8)";
            case 'maintenance': return "rgba(245, 158, 11, 0.8)";
            default: return "rgba(107, 114, 128, 0.8)";
          }
        }}
        ringMaxRadius={() => 3}
        ringPropagationSpeed={() => 3}
        ringRepeatPeriod={() => 1600}
        
        backgroundColor="black"
        showAtmosphere={false}
        showGlobe
      />
      
      {selectedProvider && selectedPosition ? (
        <div ref={tooltipRef}>
          <GlobeTooltip
            key={selectedProvider.id}
            provider={selectedProvider}
            position={selectedPosition}
          />
        </div>
      ) : null}
    </div>
  );
}


