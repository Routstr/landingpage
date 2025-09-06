"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import GlobeTooltip from "./GlobeTooltip";
import { filterStagingEndpoints, shouldHideProvider } from "@/lib/staging-filter";
 

async function fetchCountriesGeoJson(): Promise<{ features: Record<string, unknown>[] }> {
  const res = await fetch(
    "https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson"
  );
  return res.json();
}

type Provider = {
  id: string;
  name: string;
  endpoint_url: string;
  endpoint_urls?: string[];
  description?: string;
  created_at?: number;
  pubkey?: string;
  mint_urls?: string[];
  version?: string;
};

type ProviderPoint = {
  id: string;
  name: string;
  endpoint: string;
  lat: number;
  lng: number;
  altitude?: number;
  providerId: string;
  createdAt?: number;
  pubkey?: string;
  description?: string;
  version?: string;
  endpointsHttp: string[];
  endpointsTor: string[];
  models: string[];
  mint?: string;
  city?: string;
  country?: string;
};

// Cache successful geolocations by host to reduce network calls and improve consistency
const geolocationCache = new Map<string, { lat: number; lng: number; city?: string; country?: string }>();

async function fetchProviders(): Promise<Provider[]> {
  const res = await fetch("https://api.routstr.com/v1/providers/");
  if (!res.ok) throw new Error("Failed to fetch providers");
  const data = (await res.json()) as { providers: Provider[] };
  const providers = data.providers ?? [];
  // Hide providers that have any staging endpoints
  const filtered = providers.filter((p) => {
    const endpoints = Array.isArray(p.endpoint_urls) && p.endpoint_urls.length > 0
      ? p.endpoint_urls
      : [p.endpoint_url].filter(Boolean);
    return !shouldHideProvider(endpoints);
  });
  console.log("[Globe] Fetched providers:", providers.length, providers);
  console.log("[Globe] Providers after staging filter:", filtered.length);
  return filtered;
}

function extractHost(urlOrHost: string): string | null {
  try {
    // Ensure we have a protocol for URL parsing
    const hasProtocol = /^(https?:)?\/\//i.test(urlOrHost);
    const u = new URL(hasProtocol ? urlOrHost : `https://${urlOrHost}`);
    return u.hostname;
  } catch {
    // Fallback: treat as raw host if looks like a domain
    if (/^[a-z0-9.-]+$/i.test(urlOrHost)) return urlOrHost;
    return null;
  }
}

async function geolocateHost(host: string): Promise<{ lat: number; lng: number; city?: string; country?: string } | null> {
  // Skip onion addresses
  if (host.endsWith(".onion")) return null;
  if (geolocationCache.has(host)) {
    const cached = geolocationCache.get(host)!;
    console.log("[Globe] Geolocation cache hit:", host, cached);
    return cached;
  }
  try {
    // 1) Resolve hostname to IPv4 using Google DNS over HTTPS
    const dnsRes = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(host)}&type=A`
    );
    if (!dnsRes.ok) {
      console.warn("[Globe] DNS resolve failed status:", host, dnsRes.status);
      return null;
    }
    const dnsData = await dnsRes.json();
    const ip = Array.isArray(dnsData?.Answer)
      ? (
          dnsData.Answer.find(
            (a: { type: number }) => a.type === 1 // A record
          )?.data ?? null
        )
      : null;
    console.log("[Globe] DNS A record:", host, ip, dnsData?.Answer);
    if (!ip) return null;

    // 2) Try ipwho.is (IP only)
    try {
      const resIpwho = await fetch(`https://ipwho.is/${ip}`);
      if (resIpwho.ok) {
        const dataIpwho = await resIpwho.json();
        if (
          dataIpwho?.success &&
          typeof dataIpwho.latitude === "number" &&
          typeof dataIpwho.longitude === "number"
        ) {
          const value = { lat: dataIpwho.latitude, lng: dataIpwho.longitude, city: dataIpwho.city, country: dataIpwho.country };
          geolocationCache.set(host, value);
          console.log("[Globe] Geolocated IP (ipwho.is):", host, ip, value, {
            country: dataIpwho.country,
            city: dataIpwho.city,
          });
          return value;
        }
      }
    } catch (e) {
      console.warn("[Globe] ipwho.is lookup failed for IP:", ip, e);
    }

    // 3) Skip ipapi.co (removed)

    // 4) Optional: ip-api.com (HTTP-only on free tier). Only try when running over HTTP to avoid mixed content.
    try {
      if (typeof window !== "undefined" && window.location.protocol === "http:") {
        const resIpApi = await fetch(`http://ip-api.com/json/${ip}`);
        if (resIpApi.ok) {
          const dataIpApi = await resIpApi.json();
          if (
            typeof dataIpApi.lat === "number" &&
            typeof dataIpApi.lon === "number"
          ) {
            const value = { lat: dataIpApi.lat, lng: dataIpApi.lon, city: dataIpApi.city, country: dataIpApi.country };
            geolocationCache.set(host, value);
            console.log("[Globe] Geolocated IP (ip-api.com):", host, ip, value, {
              country: dataIpApi.country,
              city: dataIpApi.city,
            });
            return value;
          }
        }
      }
    } catch (e) {
      console.warn("[Globe] ip-api.com lookup failed for IP:", ip, e);
    }
  } catch (e) {
    console.warn("[Globe] Geolocation flow failed for host:", host, e);
  }
  return null;
}

function hashToCoords(input: string): { lat: number; lng: number } {
  // Simple deterministic hash-based lat/lng for fallback visibility
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  const rng = (n: number) => {
    return ((hash ^ (n * 2654435761)) >>> 0) / 2 ** 32;
  };
  const lat = -60 + rng(1) * 120; // avoid extreme poles for visibility
  const lng = -180 + rng(2) * 360;
  return { lat, lng };
}

function normalizeLng(lng: number): number {
  let x = lng;
  while (x > 180) x -= 360;
  while (x < -180) x += 360;
  return x;
}

function clampLat(lat: number): number {
  return Math.max(-89.999, Math.min(89.999, lat));
}

function disambiguateOverlappingPoints(points: ProviderPoint[]): ProviderPoint[] {
  // Group by rounded base position to detect overlaps
  const groups = new Map<string, ProviderPoint[]>();
  const keyFor = (p: ProviderPoint) => `${p.lat.toFixed(3)}|${p.lng.toFixed(3)}`; // ~100m bucket
  for (const p of points) {
    const k = keyFor(p);
    const arr = groups.get(k) ?? [];
    arr.push(p);
    groups.set(k, arr);
  }

  const adjusted: ProviderPoint[] = [];
  for (const arr of Array.from(groups.values())) {
    if (arr.length === 1) {
      adjusted.push(arr[0]);
      continue;
    }

    // Sort deterministically for stable layout
    arr.sort((a: ProviderPoint, b: ProviderPoint) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

    const n = arr.length;
    // Radius in degrees; small circle around the base point
    const baseRadiusDeg = 0.12; // ~13km at equator
    const radiusDeg = Math.min(0.25, baseRadiusDeg + Math.min(0.08, n * 0.01));

    arr.forEach((p: ProviderPoint, i: number) => {
      const angle = (2 * Math.PI * i) / n;
      const latRad = (p.lat * Math.PI) / 180;
      const scaleLng = Math.max(0.3, Math.cos(latRad)); // avoid huge shifts at poles
      const dLat = radiusDeg * Math.cos(angle);
      const dLng = (radiusDeg * Math.sin(angle)) / scaleLng;
      const alt = 0.02 + 0.004 * (i % 3); // subtle altitude staggering
      adjusted.push({
        ...p,
        lat: clampLat(p.lat + dLat),
        lng: normalizeLng(p.lng + dLng),
        altitude: alt,
      });
    });
  }

  return adjusted;
}

async function mapProvidersToPoints(providers: Provider[]): Promise<ProviderPoint[]> {
  const points = await Promise.all(
    providers.map(async (p) => {
      const host = extractHost(p.endpoint_url);
      console.log("[Globe] Extracted host:", host, "for provider:", p.id, p.name);
      let coords: { lat: number; lng: number; city?: string; country?: string } | null = null;
      if (host) {
        console.log("[Globe] Attempt geolocate host:", host, "for provider:", p.id, p.name);
        const result = await geolocateHost(host);
        console.log("[Globe] Geolocated host:", result, "for provider:", p.id, p.name);
        if (result) coords = result;
      }
      // Fallback: use deterministic coordinates from primary endpoint host
      if (!coords) {
        const fallbackKey = host ?? p.id;
        coords = hashToCoords(fallbackKey);
        console.log("[Globe] Fallback coords:", fallbackKey, "provider:", p.id, p.name, coords);
      }
      const point = {
        id: p.id,
        name: p.name,
        endpoint: p.endpoint_url,
        lat: coords.lat,
        lng: coords.lng,
        providerId: p.id,
        createdAt: p.created_at,
        pubkey: p.pubkey,
        description: p.description,
        version: p.version,
        endpointsHttp: filterStagingEndpoints([p.endpoint_url]),
        endpointsTor: filterStagingEndpoints(p.endpoint_urls ?? []).filter((u) => u.includes('.onion')),
        models: [],
        mint: p.mint_urls?.[0],
        city: coords.city,
        country: coords.country,
      } satisfies ProviderPoint;
      console.log("[Globe] Mapped provider point:", point);
      return point;
    })
  );
  const clean = points.filter(Boolean) as ProviderPoint[];
  const adjusted = disambiguateOverlappingPoints(clean);
  return adjusted;
}

 

export default function FullScreenGlobe() {
  const Globe = useMemo(() => {
    if (typeof window === "undefined") return null;
    // Dynamic require needed for SSR compatibility
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
    return require("react-globe.gl").default as React.ComponentType<any>;
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null); // Globe component doesn't have proper types
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const size = useMemo(() => {
    return dimensions.height; // size globe by viewport height only
  }, [dimensions]);
  const [hexData, setHexData] = useState<Record<string, unknown>[]>([]);
  const [providerPoints, setProviderPoints] = useState<ProviderPoint[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ProviderPoint | null>(null);
  const [selectedPos, setSelectedPos] = useState<{ x: number; y: number } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const clickHandledRef = useRef(false);

  useEffect(() => {
    const raf: number | null = null;
    const onResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    onResize();
    window.addEventListener("resize", onResize);

    // Fetch data
    fetchCountriesGeoJson().then((geo) => setHexData(geo.features));
    // Fetch providers and map to globe points
    (async () => {
      try {
        const providers = await fetchProviders();
        const points = await mapProvidersToPoints(providers);
        console.log("[Globe] Final provider points count:", points.length, points);
        setProviderPoints(points);
      } catch (e) {
        console.error("Failed to load providers:", e);
      }
    })();
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // Dismiss tooltip when clicking anywhere outside the tooltip or selected point
  useEffect(() => {
    const handleDocumentClick = (e: Event) => {
      if (!selectedProvider) return;
      const target = e.target as HTMLElement | null;
      // Defer to allow onPointClick/onGlobeClick to run first
      setTimeout(() => {
        if (!selectedProvider) return; // may have been cleared already
        if (clickHandledRef.current) {
          clickHandledRef.current = false;
          return;
        }
        // Ignore clicks inside tooltip
        if (target && target.closest('[data-globe-tooltip="true"]')) return;
        // Any other click (including canvas if not handled) closes the tooltip
        setSelectedProvider(null);
        setSelectedPos(null);
        try {
          const controls = globeRef.current?.controls?.();
          if (controls) {
            controls.autoRotate = true;
            controls.update?.();
          }
        } catch {}
      }, 0);
    };
    document.addEventListener("click", handleDocumentClick, true);
    document.addEventListener("pointerdown", handleDocumentClick, true);
    document.addEventListener("touchstart", handleDocumentClick, true);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      document.removeEventListener("pointerdown", handleDocumentClick, true);
      document.removeEventListener("touchstart", handleDocumentClick, true);
    };
  }, [selectedProvider]);

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

  const globeMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: 0xffffff }),
    []
  );

  // No tooltip handlers or click behavior

  if (!Globe) return null;

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-black flex items-center justify-center"
      onMouseMove={(e) => {
        // Track latest mouse position to place tooltip reliably
        const x = Number(e.clientX);
        const y = Number(e.clientY);
        if (!Number.isNaN(x) && !Number.isNaN(y)) {
          setMousePos({ x, y });
        }
      }}
    >
      <Globe
        ref={globeRef}
        height={size}
        globeMaterial={globeMaterial}
        hexPolygonsData={hexData}
        hexPolygonLabel={() => ""}
        hexPolygonResolution={3}
        hexPolygonMargin={0.3}
        hexPolygonUseDots
        hexPolygonColor={() => "rgba(128, 128, 128, 0.2)"}
        pointsData={providerPoints}
        pointLat={(d: ProviderPoint) => d.lat}
        pointLng={(d: ProviderPoint) => d.lng}
        pointAltitude={(d: ProviderPoint) => d.altitude ?? 0.02}
        pointRadius={() => 0.6}
        pointColor={() => "#FB6415"}
        pointLabel={() => ""}
        onPointHover={(p: ProviderPoint | null) => {
          try {
            const controls = globeRef.current?.controls?.();
            if (!controls) return;
            if (p) {
              controls.autoRotate = false;
              controls.update?.();
            } else if (!selectedProvider) {
              controls.autoRotate = true;
              controls.update?.();
            }
          } catch {}
        }}
        onPointClick={(p: ProviderPoint | null) => {
          if (!containerRef.current) return;
          if (p) {
            clickHandledRef.current = true;
            setSelectedProvider(p);
            const { x, y } = mousePos;
            if (!Number.isNaN(x) && !Number.isNaN(y)) {
              setSelectedPos({ x, y });
            }
            try {
              const controls = globeRef.current?.controls?.();
              if (controls) {
                controls.autoRotate = false;
                controls.update?.();
              }
            } catch {}
          }
        }}
        onGlobeClick={() => {
          clickHandledRef.current = true;
          setSelectedProvider(null);
          setSelectedPos(null);
          try {
            const controls = globeRef.current?.controls?.();
            if (controls) {
              controls.autoRotate = true;
              controls.update?.();
            }
          } catch {}
        }}
        pointsMerge={false}
        backgroundColor="black"
        showAtmosphere={false}
        showGlobe
      />
      <GlobeTooltip
        provider={selectedProvider ? {
          id: selectedProvider.id,
          name: selectedProvider.name,
          city: selectedProvider.city,
          country: selectedProvider.country,
          lat: selectedProvider.lat,
          lng: selectedProvider.lng,
          type: 'Routstr Node',
          status: 'online',
          description: selectedProvider.description ?? '',
          createdAt: selectedProvider.createdAt ?? 0,
          providerId: selectedProvider.providerId,
          pubkey: selectedProvider.pubkey ?? '',
          endpoints: { http: selectedProvider.endpointsHttp, tor: selectedProvider.endpointsTor },
          models: selectedProvider.models,
          mint: selectedProvider.mint,
          version: selectedProvider.version ?? '',
        } : null}
        position={selectedPos}
      />
    </div>
  );
}
