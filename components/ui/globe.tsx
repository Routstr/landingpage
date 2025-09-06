"use client";

import createGlobe, { COBEOptions } from "cobe";
import { useMotionValue, useSpring } from "motion/react";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

// Type definitions
interface COBEState {
  phi: number;
  width: number;
  height: number;
  markers: { location: [number, number]; size: number }[];
}

// Lightweight provider typing for marker plotting
type Provider = {
  id: string;
  name: string;
  endpoint_url: string;
  endpoint_urls?: string[];
};

type ProviderPoint = {
  id: string;
  name: string;
  endpoint: string;
  lat: number;
  lng: number;
};

// Deterministic fallback lat/lng generator (fast, no network lookups)
function hashToCoords(input: string): { lat: number; lng: number } {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    // eslint-disable-next-line no-bitwise
    hash = (hash << 5) - hash + input.charCodeAt(i);
    // eslint-disable-next-line no-bitwise
    hash |= 0;
  }
  const rng = (n: number) => {
    // eslint-disable-next-line no-bitwise
    return ((hash ^ (n * 2654435761)) >>> 0) / 2 ** 32;
  };
  const lat = -60 + rng(1) * 120; // visible band, avoid poles
  const lng = -180 + rng(2) * 360;
  return { lat, lng };
}

function extractHost(urlOrHost: string): string | null {
  try {
    const hasProtocol = /^(https?:)?\/\//i.test(urlOrHost);
    const u = new URL(hasProtocol ? urlOrHost : `https://${urlOrHost}`);
    return u.hostname;
  } catch {
    if (/^[a-z0-9.-]+$/i.test(urlOrHost)) return urlOrHost;
    return null;
  }
}

// Geolocation cache to reduce duplicate lookups
const geolocationCache = new Map<string, { lat: number; lng: number; city?: string; country?: string }>();

async function geolocateHost(host: string): Promise<{ lat: number; lng: number; city?: string; country?: string } | null> {
  if (host.endsWith('.onion')) return null;
  if (geolocationCache.has(host)) return geolocationCache.get(host)!;
  try {
    // Resolve hostname to IPv4 via Google DNS-over-HTTPS
    const dnsRes = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(host)}&type=A`);
    if (!dnsRes.ok) return null;
    const dnsData = await dnsRes.json();
    const ip = Array.isArray(dnsData?.Answer)
      ? (dnsData.Answer.find((a: { type: number }) => a.type === 1)?.data ?? null)
      : null;
    if (!ip) return null;

    // Try ipwho.is (HTTPS)
    try {
      const resIpwho = await fetch(`https://ipwho.is/${ip}`);
      if (resIpwho.ok) {
        const dataIpwho = await resIpwho.json();
        if (dataIpwho?.success && typeof dataIpwho.latitude === 'number' && typeof dataIpwho.longitude === 'number') {
          const value = { lat: dataIpwho.latitude, lng: dataIpwho.longitude, city: dataIpwho.city, country: dataIpwho.country };
          geolocationCache.set(host, value);
          return value;
        }
      }
    } catch {}

    // Optional ip-api.com over HTTP only when page is HTTP to avoid mixed content
    try {
      if (typeof window !== 'undefined' && window.location.protocol === 'http:') {
        const resIpApi = await fetch(`http://ip-api.com/json/${ip}`);
        if (resIpApi.ok) {
          const dataIpApi = await resIpApi.json();
          if (typeof dataIpApi.lat === 'number' && typeof dataIpApi.lon === 'number') {
            const value = { lat: dataIpApi.lat, lng: dataIpApi.lon, city: dataIpApi.city, country: dataIpApi.country };
            geolocationCache.set(host, value);
            return value;
          }
        }
      }
    } catch {}
  } catch {}
  return null;
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
  const groups = new Map<string, ProviderPoint[]>();
  const keyFor = (p: ProviderPoint) => `${p.lat.toFixed(3)}|${p.lng.toFixed(3)}`;
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
    arr.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const n = arr.length;
    const baseRadiusDeg = 0.12;
    const radiusDeg = Math.min(0.25, baseRadiusDeg + Math.min(0.08, n * 0.01));

    arr.forEach((p, i) => {
      const angle = (2 * Math.PI * i) / n;
      const latRad = (p.lat * Math.PI) / 180;
      const scaleLng = Math.max(0.3, Math.cos(latRad));
      const dLat = radiusDeg * Math.cos(angle);
      const dLng = (radiusDeg * Math.sin(angle)) / scaleLng;
      adjusted.push({
        ...p,
        lat: clampLat(p.lat + dLat),
        lng: normalizeLng(p.lng + dLng),
      });
    });
  }
  return adjusted;
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
          // draw provider markers gathered asynchronously
          (state as COBEState).markers = markersRef.current;
        },
      });
    } catch (e) {
      console.error("Globe Error: createGlobe call failed.", e);
      console.error("Globe Error Details: Canvas at time of error:", canvasRef.current);
      return;
    }

    setTimeout(() => (canvasRef.current!.style.opacity = "1"), 0);

    return () => {
      if (globe) {
        globe.destroy();
      }
      window.removeEventListener("resize", onResize);
      cancelled = true;
    };
  }, [rs, config]);

  // Fetch providers and geolocate to plot accurate markers like the full-screen globe
  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const res = await fetch("https://api.routstr.com/v1/providers/");
        if (!res.ok) return;
        const data = (await res.json()) as { providers?: Provider[] };
        const providers = data.providers ?? [];
        // Map providers to points using geolocation with fallback to hashed coords
        const points: ProviderPoint[] = [];
        for (const p of providers) {
          const host = extractHost(p.endpoint_url);
          let latlng: { lat: number; lng: number } | null = null;
          if (host) {
            // eslint-disable-next-line no-await-in-loop
            const geo = await geolocateHost(host);
            if (geo) latlng = { lat: geo.lat, lng: geo.lng };
          }
          if (!latlng) {
            const key = host ?? p.id;
            latlng = hashToCoords(key);
          }
          points.push({ id: p.id, name: p.name, endpoint: p.endpoint_url, lat: latlng.lat, lng: latlng.lng });
        }
        const adjusted = disambiguateOverlappingPoints(points);
        const markers = adjusted.map((pt) => ({ location: [pt.lat, pt.lng] as [number, number], size: 0.06 }));
        if (!aborted) {
          markersRef.current = markers;
        }
      } catch (e) {
        // Silent fail on homepage; keep globe responsive without markers
      }
    })();
    return () => {
      aborted = true;
    };
  }, []);

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
