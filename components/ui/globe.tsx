"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  fetchProvidersList,
  isOnionOnlyProvider,
  isProviderVisible,
} from "@/lib/api/providers";
import GlobeTooltip, { type GlobeTooltipProvider } from "../client/GlobeTooltip";
import type { GlobeMethods } from "react-globe.gl";
import dynamic from "next/dynamic";
import { useIsMobile } from "@/hooks/use-mobile";

const GlobeComp = dynamic(() => import("react-globe.gl"), { ssr: false });

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
  mint_urls?: string[];
  description?: string;
  created_at?: number;
};

type ProviderPoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description?: string;
  createdAt?: number;
  mints?: string[];
};

function isProviderPoint(value: unknown): value is ProviderPoint {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.lat === "number" &&
    typeof candidate.lng === "number"
  );
}

function hashToCoords(input: string): { lat: number; lng: number } {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  const rng = (n: number) => {
    return ((hash ^ (n * 2654435761)) >>> 0) / 2 ** 32;
  };
  const lat = -60 + rng(1) * 120;
  const lng = -180 + rng(2) * 360;
  return { lat, lng };
}

export function Globe({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const isMobile = useIsMobile();
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hexData, setHexData] = useState<Record<string, unknown>[]>([]);
  const [points, setPoints] = useState<ProviderPoint[]>([]);
  const [size, setSize] = useState(600);
  
  const [selectedProvider, setSelectedProvider] = useState<GlobeTooltipProvider | null>(null);
  const [selectedPos, setSelectedPos] = useState<{ x: number; y: number } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  const [isHoveringTooltip, setIsHoveringTooltip] = useState(false);
  const [mobileRotationLocked, setMobileRotationLocked] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;
    setMounted(true);
    const updateSize = () => {
      const width = window.innerWidth;
      const targetSize = Math.min(width - 48, 1200); 
      setSize(targetSize);
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    
    fetchCountriesGeoJson().then((geo) => setHexData(geo.features));
    
    fetchProvidersList()
      .then((providers: Provider[]) => {
        if (!isMounted) return;
        const mapped = providers
          .filter((provider) => isProviderVisible(provider))
          .filter((provider) => !isOnionOnlyProvider(provider))
          .map((provider) => {
            const coords = hashToCoords(provider.id);
            return {
              id: provider.id,
              name: provider.name,
              lat: coords.lat,
              lng: coords.lng,
              description: provider.description,
              createdAt: provider.created_at,
              mints: provider.mint_urls,
            };
          });
        setPoints(mapped);
      })
      .catch(() => {
        if (!isMounted) return;
        setPoints([]);
      });

    return () => {
      isMounted = false;
      window.removeEventListener("resize", updateSize);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const checkRef = setInterval(() => {
      if (globeRef.current) {
        const controls = globeRef.current.controls();
        if (controls) {
          clearInterval(checkRef);
          
          // Configure controls
          controls.autoRotate = true;
          controls.autoRotateSpeed = -1.0; // Reverse direction
          controls.enableDamping = false; // Disable damping initially to prevent 'slide'
          controls.minDistance = 150;
          controls.maxDistance = 500;
          
          // Snap view with smaller zoom (larger altitude)
          globeRef.current.pointOfView({ lat: 20, lng: 0, altitude: 2.8 }, 0);
          controls.update();
          
          // Re-enable damping after snap and set as ready
          setTimeout(() => {
            if (globeRef.current) {
              globeRef.current.controls().enableDamping = true;
              setIsReady(true);
            }
          }, 100);
        }
      }
    }, 100);

    return () => {
      clearInterval(checkRef);
    };
  }, [mounted]);

  useEffect(() => {
    if (!isMobile) {
      setMobileRotationLocked(false);
      return;
    }
    if (!globeRef.current) return;
    const controls = globeRef.current.controls();
    if (controls) controls.autoRotate = !mobileRotationLocked;
  }, [isMobile, mobileRotationLocked]);

  useEffect(() => {
    if (!isMobile || !mobileRotationLocked) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && containerRef.current?.contains(target)) return;
      setMobileRotationLocked(false);
      setSelectedProvider(null);
      setSelectedPos(null);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [isMobile, mobileRotationLocked]);

  const globeMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: 0x141414 }),
    []
  );

  const clearHideTimeout = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  if (!mounted) return null;

  return (
    <div 
      ref={containerRef}
      className={`${className} transition-opacity duration-1000 ${isReady ? 'opacity-100' : 'opacity-0'}`}
      onMouseMove={(e) => {
        setMousePos({ x: e.clientX, y: e.clientY });
      }}
      onMouseEnter={() => {
        if (isMobile) return;
        if (globeRef.current) globeRef.current.controls().autoRotate = false;
      }}
      onMouseLeave={() => {
        if (isMobile) return;
        if (globeRef.current && !selectedProvider && !isHoveringTooltip) {
          globeRef.current.controls().autoRotate = true;
        }
      }}
    >
      <GlobeComp
        ref={globeRef}
        width={size}
        height={size}
        backgroundColor="rgba(0,0,0,0)"
        globeMaterial={globeMaterial}
        hexPolygonsData={hexData}
        hexPolygonResolution={3}
        hexPolygonMargin={0.3}
        hexPolygonUseDots
        hexPolygonColor={() => "rgba(255, 255, 255, 0.15)"}
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointRadius={0.4}
        pointAltitude={0.01}
        pointColor={() => "#e5e5e5"}
        pointLabel={() => ""}
        showAtmosphere={false}
        onPointHover={(p: unknown) => {
          if (isMobile) return;
          clearHideTimeout();
          if (isProviderPoint(p)) {
            setSelectedProvider({
              ...p,
              type: 'Routstr Node',
              status: 'online',
              endpoints: { http: [], tor: [] },
              models: [],
              mints: p.mints ?? [],
              version: ''
            });
            setSelectedPos({ x: mousePos.x, y: mousePos.y });
            if (globeRef.current) globeRef.current.controls().autoRotate = false;
          } else {
            hideTimeoutRef.current = setTimeout(() => {
              if (!isHoveringTooltip) {
                setSelectedProvider(null);
                setSelectedPos(null);
                if (globeRef.current && !containerRef.current?.matches(':hover')) {
                  globeRef.current.controls().autoRotate = true;
                }
              }
            }, 250);
          }
        }}
        onGlobeClick={() => {
          setSelectedProvider(null);
          setSelectedPos(null);
          if (isMobile) {
            setMobileRotationLocked(true);
            if (globeRef.current) globeRef.current.controls().autoRotate = false;
            return;
          }
          if (globeRef.current) globeRef.current.controls().autoRotate = true;
        }}
      />
      <GlobeTooltip 
        provider={selectedProvider} 
        position={selectedPos}
        onMouseEnter={() => {
          setIsHoveringTooltip(true);
          clearHideTimeout();
        }}
        onMouseLeave={() => {
          setIsHoveringTooltip(false);
          setSelectedProvider(null);
          setSelectedPos(null);
          if (globeRef.current && !containerRef.current?.matches(':hover')) {
            globeRef.current.controls().autoRotate = true;
          }
        }}
      />
    </div>
  );
}
