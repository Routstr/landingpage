"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import GlobeTooltip, { type GlobeTooltipProvider } from "../client/GlobeTooltip";
import type { GlobeMethods } from "react-globe.gl";
import dynamic from "next/dynamic";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  fetchProviderPointsFromApiRoute,
  fetchProviderPointsFromEndpointIpProgressive,
} from "@/lib/globe/provider-points-client";
import {
  isProviderPoint,
  mergeProviderPoints,
  type ProviderPoint,
} from "@/lib/globe/provider-points";

const GlobeComp = dynamic(() => import("react-globe.gl"), { ssr: false });
const POINT_FETCH_DELAY_MS = 200;
const POINT_FETCH_CONCURRENCY = 4;
type TimeoutHandle = ReturnType<typeof setTimeout>;

async function fetchCountriesGeoJson(): Promise<{ features: Record<string, unknown>[] }> {
  const res = await fetch(
    "https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson"
  );
  return res.json();
}

export function Globe({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
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
  const hideTimeoutRef = useRef<TimeoutHandle | null>(null);
  const suppressNextGlobeClickRef = useRef(false);

  const buildTooltipProvider = (point: ProviderPoint): GlobeTooltipProvider => ({
    ...point,
    type: "Routstr Node",
    status: "online",
    endpoints: { http: [], tor: [] },
    models: [],
    mints: point.mints ?? [],
    version: "",
  });

  const getEventClientPosition = (
    event: unknown
  ): { x: number; y: number } | null => {
    if (!event || typeof event !== "object") return null;
    const eventRecord = event as Record<string, unknown>;
    const clientX = eventRecord.clientX;
    const clientY = eventRecord.clientY;
    if (typeof clientX === "number" && typeof clientY === "number") {
      return { x: clientX, y: clientY };
    }

    const touches = eventRecord.touches as
      | { length: number; [index: number]: { clientX: number; clientY: number } }
      | undefined;
    if (touches && touches.length > 0) {
      const first = touches[0];
      if (typeof first?.clientX === "number" && typeof first?.clientY === "number") {
        return { x: first.clientX, y: first.clientY };
      }
    }

    const changedTouches = eventRecord.changedTouches as
      | { length: number; [index: number]: { clientX: number; clientY: number } }
      | undefined;
    if (changedTouches && changedTouches.length > 0) {
      const first = changedTouches[0];
      if (typeof first?.clientX === "number" && typeof first?.clientY === "number") {
        return { x: first.clientX, y: first.clientY };
      }
    }

    return null;
  };

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();
    let pointsFetchTimer: TimeoutHandle | null = null;
    setMounted(true);
    const updateSize = () => {
      const width = window.innerWidth;
      const targetSize = Math.min(width - 48, 1200);
      setSize(targetSize);
    };
    updateSize();
    window.addEventListener("resize", updateSize);

    void fetchCountriesGeoJson()
      .then((geo) => {
        if (!isMounted) return;
        setHexData(geo.features);
      })
      .catch(() => {
        if (!isMounted) return;
        setHexData([]);
      });

    void fetchProviderPointsFromApiRoute()
      .then((apiPoints) => {
        if (!isMounted || apiPoints.length === 0) return;
        setPoints((prev) => mergeProviderPoints(prev, apiPoints));
      })
      .catch(() => {
        // Progressive fallback continues below.
      });

    // Defer point geolocation work so the globe itself paints first.
    pointsFetchTimer = setTimeout(() => {
      void fetchProviderPointsFromEndpointIpProgressive(
        (point) => {
          if (!isMounted) return;
          setPoints((prev) => mergeProviderPoints(prev, [point]));
        },
        { signal: abortController.signal, concurrency: POINT_FETCH_CONCURRENCY }
      ).catch(() => {
        // Ignore fallback failures and keep any points already plotted.
      });
    }, POINT_FETCH_DELAY_MS);

    return () => {
      isMounted = false;
      abortController.abort();
      if (pointsFetchTimer) clearTimeout(pointsFetchTimer);
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
          
          // Re-enable damping after snap
          setTimeout(() => {
            if (globeRef.current) {
              globeRef.current.controls().enableDamping = true;
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
      if (
        target &&
        target instanceof Element &&
        target.closest("[data-globe-tooltip='true']")
      ) {
        return;
      }
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
      className={className}
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
            setSelectedProvider(buildTooltipProvider(p));
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
        onPointClick={(p: unknown, event: unknown) => {
          if (!isProviderPoint(p)) return;

          suppressNextGlobeClickRef.current = true;
          requestAnimationFrame(() => {
            suppressNextGlobeClickRef.current = false;
          });

          clearHideTimeout();
          setSelectedProvider(buildTooltipProvider(p));

          const eventPos = getEventClientPosition(event);
          if (eventPos) {
            setSelectedPos(eventPos);
          } else {
            setSelectedPos({ x: mousePos.x, y: mousePos.y });
          }

          if (isMobile) {
            setMobileRotationLocked(true);
          }
          if (globeRef.current) globeRef.current.controls().autoRotate = false;
        }}
        onGlobeClick={() => {
          if (suppressNextGlobeClickRef.current) return;
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
