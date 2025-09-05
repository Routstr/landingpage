"use client";

import createGlobe, { COBEOptions } from "cobe";
import { useMotionValue, useSpring } from "motion/react";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import { filterStagingEndpoints, shouldHideProvider } from "@/lib/staging-filter";

// Type definitions
interface GeoLocationResponse {
  lat?: number;
  lng?: number;
  latitude?: string | number;
  longitude?: string | number;
  lon?: string | number;
  status?: string;
  success?: boolean;
}

interface ProviderEntry {
  health?: {
    json?: {
      http_url?: string;
    };
  };
  provider?: {
    endpoint_url?: string;
    endpoint_urls?: string[];
    pubkey?: string;
    id?: string;
  };
}

interface ProvidersResponse {
  providers?: ProviderEntry[];
}

interface COBEState {
  phi: number;
  width: number;
  height: number;
  markers: { location: [number, number]; size: number }[];
}

const MOVEMENT_DAMPING = 1400;

const GLOBE_CONFIG: COBEOptions = {
  width: 800,
  height: 800,
  onRender: () => { },
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 0,
  diffuse: 0.4,
  mapSamples: 16000,
  mapBrightness: 1.2,
  baseColor: [1, 1, 1],
  markerColor: [251 / 255, 100 / 255, 21 / 255],
  glowColor: [1, 1, 1],
  markers: [],
};

export function Globe({
  className,
  config = GLOBE_CONFIG,
}: {
  className?: string;
  config?: COBEOptions;
}) {
  const markersRef = useRef<{ location: [number, number]; size: number }[]>([]);
  const phiRef = useRef(0);
  const widthRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);
  const geoCache = useRef(new Map<string, { lat: number; lng: number }>());

  const r = useMotionValue(0);
  const rs = useSpring(r, {
    mass: 1,
    damping: 30,
    stiffness: 100,
  });

  const updatePointerInteraction = (value: number | null) => {
    pointerInteracting.current = value;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = value !== null ? "grabbing" : "grab";
    }
  };

  const updateMovement = (clientX: number) => {
    if (pointerInteracting.current !== null) {
      const delta = clientX - pointerInteracting.current;
      pointerInteractionMovement.current = delta;
      r.set(r.get() + delta / MOVEMENT_DAMPING);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const onResize = () => {
      if (canvasRef.current) {
        widthRef.current = canvasRef.current.offsetWidth;
      }
    };

    window.addEventListener("resize", onResize);
    onResize();
    let globe: ReturnType<typeof createGlobe> | null = null;

    try {
      globe = createGlobe(canvasRef.current!, {
        ...config,
        width: widthRef.current * 2,
        height: widthRef.current * 2,
        onRender: (state) => {
          if (!pointerInteracting.current) phiRef.current += 0.005;
          state.phi = phiRef.current + rs.get();
          state.width = widthRef.current * 2;
          state.height = widthRef.current * 2;
          // update markers dynamically if set
          if (markersRef.current && (state as COBEState).markers !== markersRef.current) {
            (state as COBEState).markers = markersRef.current;
          }
        },
      });
    } catch (e) {
      console.error("Globe Error: createGlobe call failed.", e);
      console.error("Globe Error Details: Canvas at time of error:", canvasRef.current);
      return;
    }

    setTimeout(() => (canvasRef.current!.style.opacity = "1"), 0);

    // Fetch providers and set markers with client-side geolocation
    (async () => {
      async function geolocateHost(host: string): Promise<{ lat: number; lng: number } | null> {
        // Skip localhost, private IPs, and .onion domains
        if (host === 'localhost' || host.startsWith('127.') || host.startsWith('192.168.') || 
            host.startsWith('10.') || host.endsWith('.onion') || host.startsWith('172.')) {
          return null;
        }
        
        const cached = geoCache.current.get(host);
        if (cached) return cached;
        
        const services = [
          {
            url: `https://ip-api.com/json/${encodeURIComponent(host)}?fields=status,lat,lon`,
            parser: (data: GeoLocationResponse) =>
              data.status === 'success' && data.lat !== undefined && data.lon !== undefined
                ? { lat: Number(data.lat), lng: Number(data.lon) }
                : null
          },
          {
            url: `https://ipapi.co/${encodeURIComponent(host)}/json/`,
            parser: (data: GeoLocationResponse) => data.latitude && data.longitude ? { lat: parseFloat(String(data.latitude)), lng: parseFloat(String(data.longitude)) } : null
          },
          {
            url: `https://ipwho.is/${encodeURIComponent(host)}`,
            parser: (data: GeoLocationResponse) => data.success && data.latitude && data.longitude ? { lat: parseFloat(String(data.latitude)), lng: parseFloat(String(data.longitude)) } : null
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
              geoCache.current.set(host, coords);
              return coords;
            }
          } catch {
            continue;
          }
        }
        return null;
      }

      try {
        const res = await fetch('https://api.routstr.com/v1/providers/?include_json=true');
        if (!res.ok) throw new Error(`Failed providers fetch: ${res.status}`);
        const data: ProvidersResponse = await res.json();
        const entries = Array.isArray(data.providers) ? data.providers : [];
        
        // Filter out staging providers
        const filteredEntries = entries.filter((entry: ProviderEntry) => {
          const allEndpoints = entry?.provider?.endpoint_urls || [];
          return !shouldHideProvider(allEndpoints);
        });
        
        const markers = await Promise.all(filteredEntries.map(async (entry: ProviderEntry) => {
          // Filter out staging endpoints when selecting endpoint for geolocation
          const filteredEndpoints = filterStagingEndpoints(entry?.provider?.endpoint_urls || []);
          const endpoint = entry?.health?.json?.http_url || entry?.provider?.endpoint_url || filteredEndpoints[0];
          let lat: number | undefined;
          let lng: number | undefined;
          
          if (endpoint) {
            try {
              const host = (() => { 
                try { 
                  return new URL(endpoint).hostname; 
                } catch { 
                  const m = String(endpoint).match(/^[a-z0-9.-]+/i); 
                  return m ? m[0] : null; 
                } 
              })();
              
              if (host) {
                const coords = await geolocateHost(host);
                if (coords) {
                  lat = coords.lat;
                  lng = coords.lng;
                }
              }
            } catch {}
          }
          
          if (lat === undefined || lng === undefined) {
            const base = entry?.provider?.pubkey || entry?.provider?.id || entry?.health?.json?.http_url || Math.random().toString(36).slice(2);
            const h = (() => { let x = 5381; for (let i = 0; i < base.length; i++) x = (x * 33) ^ base.charCodeAt(i); return x >>> 0; })();
            lat = ((h % 12000) / 100) - 60;
            lng = (((Math.floor(h / 12000)) % 36000) / 100) - 180;
          }
          return { location: [lat, lng] as [number, number], size: 0.08 };
        }));
        
        if (!cancelled) {
          markersRef.current = markers;
        }
      } catch {
        // ignore failure, keep no markers
      }
    })();
    return () => {
      if (globe) {
        globe.destroy();
      }
      window.removeEventListener("resize", onResize);
      cancelled = true;
    };
  }, [rs, config]);

  return (
    <div
      className={cn(
        "relative mx-auto aspect-[1/1] w-full max-w-[700px]",
        className,
      )}
    >
      <canvas
        className={cn(
          "size-full opacity-0 transition-opacity duration-500 [contain:layout_paint_size]",
        )}
        ref={canvasRef}
        onPointerDown={(e) => {
          pointerInteracting.current = e.clientX;
          updatePointerInteraction(e.clientX);
        }}
        onPointerUp={() => updatePointerInteraction(null)}
        onPointerOut={() => updatePointerInteraction(null)}
        onMouseMove={(e) => updateMovement(e.clientX)}
        onTouchMove={(e) =>
          e.touches[0] && updateMovement(e.touches[0].clientX)
        }
      />
    </div>
  );
}
