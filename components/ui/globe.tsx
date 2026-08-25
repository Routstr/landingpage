"use client";

import React, { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import type { Event } from "nostr-tools";
import GlobeTooltip, { type GlobeTooltipProvider } from "../client/GlobeTooltip";
import type { GlobeMethods } from "react-globe.gl";
import dynamic from "next/dynamic";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/app/contexts/ThemeContext";
import {
  fetchProviderPointsFromEndpointIpProgressive,
} from "@/lib/globe/provider-points-client";
import { fetchRelayPoints } from "@/lib/globe/relay-points-client";
import { cn } from "@/lib/utils";
import {
  isProviderPoint,
  mergeProviderPoints,
  type ProviderPoint,
} from "@/lib/globe/provider-points";
import type { RelayPoint } from "@/lib/globe/relay-points";
import { createPool, getDefaultRelays } from "@/lib/nostr";
import { gsap } from "@/lib/gsap";

const GlobeComp = dynamic(() => import("react-globe.gl"), { ssr: false });
const POINT_FETCH_DELAY_MS = 200;
const CLUSTER_COORD_PRECISION = 4;
const CLUSTER_RING_CAPACITY = 8;
const BASE_POINT_ALTITUDE = 0.01;
const BASE_POINT_RADIUS = 0.4;
const STACK_POINT_ALTITUDE_STEP = 0.006;
const STACK_POINT_RADIUS = 0.34;
const STACK_SPREAD_DEGREES_BASE = 0.18;
const STACK_SPREAD_DEGREES_STEP = 0.12;
// Relay markers are deliberately purple: they identify the Nostr publication
// rail, while orange remains reserved for paid API request flow.
const RELAY_POINT_ALTITUDE = 0.008;
const RELAY_POINT_RADIUS = 0.22;
const RELAY_COLOR_LIGHT = "#7e22ce";
const RELAY_COLOR_DARK = "#c084fc";
// Live-activity pulses at provider node locations — brand orange, used the
// same sparing way the rest of the design system reserves it (one status
// dot, one lit facet, here: one ping per live node).
const ACTIVITY_RING_MAX_RADIUS_DEG = 3.2;
const ACTIVITY_RING_PROPAGATION_SPEED = 1.6;
const ACTIVITY_RING_REPEAT_PERIOD_MS = 2600;
const ANALYTICS_KIND = 38422;
const ACTIVITY_ROUTE_LIMIT = 18;
const ACTIVITY_ROUTE_TTL_MS = 12_000;
const PACKET_FRAME_INTERVAL_MS = 100;
const PACKET_TRAVEL_MS = 2_200;
const ACTIVITY_RELAYS = Array.from(
  new Set([...getDefaultRelays(), "wss://relay.routstr.com", "wss://nos.lol"])
);
type TimeoutHandle = ReturnType<typeof setTimeout>;

type RenderPoint = ProviderPoint & {
  plotLat: number;
  plotLng: number;
  plotAltitude: number;
  plotRadius: number;
};

type RelayRenderPoint = RelayPoint & {
  plotLat: number;
  plotLng: number;
  plotAltitude: number;
  plotRadius: number;
};

type CombinedRenderPoint = RenderPoint | RelayRenderPoint;

type ActivityRoute = {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  rail: "api" | "nostr";
  startedAt: number;
};

type ActivityPacket = {
  kind: "packet";
  id: string;
  lat: number;
  lng: number;
  altitude: number;
  radius: number;
  color: string;
};

function isRelayRenderPoint(point: CombinedRenderPoint): point is RelayRenderPoint {
  return "kind" in point && point.kind === "relay";
}

function isActivityPacket(point: CombinedRenderPoint | ActivityPacket): point is ActivityPacket {
  return "kind" in point && point.kind === "packet";
}

type GlobeRenderBoundaryProps = {
  fallback: React.ReactNode;
  children: React.ReactNode;
};

type GlobeRenderBoundaryState = {
  hasError: boolean;
};

class GlobeRenderBoundary extends React.Component<
  GlobeRenderBoundaryProps,
  GlobeRenderBoundaryState
> {
  state: GlobeRenderBoundaryState = { hasError: false };

  static getDerivedStateFromError(): GlobeRenderBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(): void {
    // Swallow render errors from WebGL renderer and show fallback UI.
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function toClusterKey(lat: number, lng: number): string {
  return `${lat.toFixed(CLUSTER_COORD_PRECISION)}:${lng.toFixed(
    CLUSTER_COORD_PRECISION
  )}`;
}

function clampLatitude(lat: number): number {
  return Math.max(-89.5, Math.min(89.5, lat));
}

function wrapLongitude(lng: number): number {
  return ((lng + 180) % 360 + 360) % 360 - 180;
}

function getNetworkCenter(points: ProviderPoint[], relayPoints: RelayPoint[]): { lat: number; lng: number } | null {
  const locations = [...points, ...relayPoints];
  if (locations.length === 0) return null;

  const { x, y, lat } = locations.reduce(
    (total, point) => {
      const longitude = (point.lng * Math.PI) / 180;
      return {
        x: total.x + Math.cos(longitude),
        y: total.y + Math.sin(longitude),
        lat: total.lat + point.lat,
      };
    },
    { x: 0, y: 0, lat: 0 }
  );

  return {
    lat: lat / locations.length,
    lng: (Math.atan2(y, x) * 180) / Math.PI,
  };
}

async function fetchCountriesGeoJson(signal: AbortSignal): Promise<{ features: Record<string, unknown>[] }> {
  const res = await fetch(
    "https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson",
    { signal }
  );
  return res.json();
}

function browserSupportsWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    if (!canvas) return false;
    return Boolean(
      canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

function GlobeFallback({
  className,
  pointsCount,
}: {
  className?: string;
  pointsCount: number;
}) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full border border-border/70 bg-gradient-to-b from-muted/20 via-background to-background text-center",
        className
      )}
    >
      <div className="space-y-2 px-6">
        <p className="text-sm text-foreground">Live node map unavailable</p>
        <p className="text-xs text-muted-foreground">
          WebGL is disabled in this browser.
        </p>
        {pointsCount > 0 ? (
          <p className="text-xs text-muted-foreground">
            {pointsCount} node{pointsCount === 1 ? "" : "s"} detected
          </p>
        ) : null}
      </div>
    </div>
  );
}

type GlobeProps = {
  className?: string;
  viewportTargetRef?: RefObject<HTMLElement | null>;
};

export function Globe({ className, viewportTargetRef }: GlobeProps) {
  const [mounted, setMounted] = useState(false);
  const [supportsWebGL, setSupportsWebGL] = useState<boolean | null>(null);
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hexData, setHexData] = useState<Record<string, unknown>[]>([]);
  const [points, setPoints] = useState<ProviderPoint[]>([]);
  const [relayPoints, setRelayPoints] = useState<RelayPoint[]>([]);
  const [activityRoutes, setActivityRoutes] = useState<ActivityRoute[]>([]);
  const [activityPackets, setActivityPackets] = useState<ActivityPacket[]>([]);
  const activeRelayIdsRef = useRef(new Set<string>());
  const [size, setSize] = useState(600);
  
  const [selectedProvider, setSelectedProvider] = useState<GlobeTooltipProvider | null>(null);
  const [selectedPos, setSelectedPos] = useState<{ x: number; y: number } | null>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const pointsRef = useRef<ProviderPoint[]>([]);
  const relayPointsRef = useRef<RelayPoint[]>([]);
  const themeRef = useRef(theme);
  
  const [isHoveringTooltip, setIsHoveringTooltip] = useState(false);
  const [mobileRotationLocked, setMobileRotationLocked] = useState(false);
  const hideTimeoutRef = useRef<TimeoutHandle | null>(null);
  const suppressNextGlobeClickRef = useRef(false);
  const scrollGuidedRef = useRef(false);
  const selectedProviderRef = useRef<GlobeTooltipProvider | null>(null);
  const isHoveringTooltipRef = useRef(false);
  const isDraggingRef = useRef(false);
  const cameraRef = useRef({ lat: 18, lng: -42 });
  const hasPositionedNetworkRef = useRef(false);
  const globeVisibleRef = useRef(true);
  const networkCenter = useMemo(() => getNetworkCenter(points, relayPoints), [points, relayPoints]);

  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  useEffect(() => {
    relayPointsRef.current = relayPoints;
  }, [relayPoints]);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    selectedProviderRef.current = selectedProvider;
  }, [selectedProvider]);

  useEffect(() => {
    isHoveringTooltipRef.current = isHoveringTooltip;
  }, [isHoveringTooltip]);

  useEffect(() => {
    if (!networkCenter || hasPositionedNetworkRef.current) return;
    cameraRef.current = networkCenter;
    hasPositionedNetworkRef.current = true;
  }, [networkCenter]);

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
    setSupportsWebGL(browserSupportsWebGL());
    const updateSize = () => {
      const width = window.innerWidth;
      const targetSize = Math.max(1, Math.min(width - 48, 1200));
      setSize(targetSize);
    };
    updateSize();
    window.addEventListener("resize", updateSize);

    void fetchCountriesGeoJson(abortController.signal)
      .then((geo) => {
        if (!isMounted) return;
        setHexData(geo.features);
      })
      .catch(() => {
        if (!isMounted) return;
        setHexData([]);
      });

    void fetchRelayPoints({ signal: abortController.signal })
      .then((fetched) => {
        if (!isMounted) return;
        setRelayPoints(fetched);
      })
      .catch(() => {
        // Ignore relay lookup failures — provider nodes still render fine.
      });

    // Defer point geolocation work so the globe itself paints first.
    pointsFetchTimer = setTimeout(() => {
      void fetchProviderPointsFromEndpointIpProgressive(
        (point) => {
          if (!isMounted) return;
          setPoints((prev) => mergeProviderPoints(prev, [point]));
        },
        { signal: abortController.signal }
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
    if (points.length === 0 || relayPoints.length === 0) return;

    const pool = createPool();
    let closed = false;
    let relayCursor = 0;
    const cleanupTimer = window.setInterval(() => {
      const cutoff = Date.now() - ACTIVITY_ROUTE_TTL_MS;
      setActivityRoutes((routes) => {
        const activeRoutes = routes.filter((route) => route.startedAt > cutoff);
        return activeRoutes.length === routes.length ? routes : activeRoutes;
      });
    }, 2_000);

    const sub = pool.subscribeMany(
      ACTIVITY_RELAYS,
      { kinds: [ANALYTICS_KIND], limit: 100 },
      {
        onevent(event: Event) {
          if (closed) return;
          const providers = pointsRef.current;
          const provider = providers.find((point) => point.pubkey === event.pubkey);
          if (!provider) return;
          try {
            const payload = JSON.parse(event.content) as { schema?: unknown };
            if (typeof payload.schema !== "string" || !payload.schema.startsWith("routstr.analytics.")) return;
          } catch {
            return;
          }

          const relays = relayPointsRef.current;
          const activeRelays = relays.filter((relay) => activeRelayIdsRef.current.has(relay.id));
          const relaySet = activeRelays.length > 0 ? activeRelays : relays;
          if (relaySet.length === 0) return;
          const relay = relaySet[relayCursor % relaySet.length];
          relayCursor += 1;
          const timestamp = Date.now();
          const routeId = `${event.id}:${timestamp}`;
          const nostrRoute: ActivityRoute = {
            id: `${routeId}:nostr`,
            startLat: provider.lat,
            startLng: provider.lng,
            endLat: relay.lat,
            endLng: relay.lng,
            color: themeRef.current === "light" ? "rgba(126, 34, 206, 0.72)" : "rgba(192, 132, 252, 0.88)",
            rail: "nostr",
            startedAt: timestamp,
          };
          const providerIndex = providers.findIndex((point) => point.id === provider.id);
          const destination = providers[(providerIndex + 1 + event.id.charCodeAt(0)) % providers.length];
          const apiRoute: ActivityRoute | null = destination && destination.id !== provider.id
            ? {
                id: `${routeId}:api`,
                startLat: provider.lat,
                startLng: provider.lng,
                endLat: destination.lat,
                endLng: destination.lng,
                color: "rgba(247, 147, 26, 0.88)",
                rail: "api",
                startedAt: timestamp + 350,
              }
            : null;
          setActivityRoutes((routes) => [
            ...routes.slice(-(ACTIVITY_ROUTE_LIMIT - (apiRoute ? 2 : 1))),
            nostrRoute,
            ...(apiRoute ? [apiRoute] : []),
          ]);
        },
        receivedEvent(relay) {
          activeRelayIdsRef.current.add(relay.url);
        },
      }
    );

    return () => {
      closed = true;
      window.clearInterval(cleanupTimer);
      sub.close();
      pool.close(ACTIVITY_RELAYS);
    };
  }, [points.length, relayPoints.length]);

  useEffect(() => {
    if (points.length < 2 || relayPoints.length === 0) return;

    let cursor = 0;
    const addRoute = () => {
      const source = points[cursor % points.length];
      const destination = points[(cursor + 1) % points.length];
      const relay = relayPoints[cursor % relayPoints.length];
      const startedAt = Date.now();
      const routeId = `network-heartbeat:${startedAt}`;
      cursor += 1;

      setActivityRoutes((routes) => [
        ...routes.slice(-(ACTIVITY_ROUTE_LIMIT - 2)),
        {
          id: `${routeId}:nostr`,
          startLat: source.lat,
          startLng: source.lng,
          endLat: relay.lat,
          endLng: relay.lng,
          color: themeRef.current === "light" ? "rgba(126, 34, 206, 0.72)" : "rgba(192, 132, 252, 0.88)",
          rail: "nostr",
          startedAt,
        },
        {
          id: `${routeId}:api`,
          startLat: source.lat,
          startLng: source.lng,
          endLat: destination.lat,
          endLng: destination.lng,
          color: "rgba(247, 147, 26, 0.88)",
          rail: "api",
          startedAt: startedAt + 350,
        },
      ]);
    };

    addRoute();
    const heartbeat = window.setInterval(addRoute, 2_600);
    return () => window.clearInterval(heartbeat);
  }, [points, relayPoints]);

  useEffect(() => {
    if (activityRoutes.length === 0) {
      setActivityPackets((packets) => (packets.length === 0 ? packets : []));
      return;
    }
    let lastFrameAt = 0;
    const updatePackets = () => {
      if (!globeVisibleRef.current) return;
      const now = Date.now();
      if (now - lastFrameAt < PACKET_FRAME_INTERVAL_MS) return;
      lastFrameAt = now;
      setActivityPackets(
        activityRoutes.flatMap((route) => {
          const age = now - route.startedAt;
          if (age < 0 || age > ACTIVITY_ROUTE_TTL_MS) return [];
          const progress = (age % PACKET_TRAVEL_MS) / PACKET_TRAVEL_MS;
          const arcLift = Math.sin(progress * Math.PI) * 0.16;
          return [{
            kind: "packet" as const,
            id: `${route.id}:packet`,
            lat: route.startLat + (route.endLat - route.startLat) * progress,
            lng: route.startLng + (route.endLng - route.startLng) * progress,
            altitude: 0.026 + arcLift,
            radius: route.rail === "api" ? 0.28 : 0.23,
            color: route.rail === "api" ? "#f7931a" : theme === "light" ? "#7e22ce" : "#c084fc",
          }];
        })
      );
    };
    gsap.ticker.add(updatePackets);
    updatePackets();
    return () => {
      gsap.ticker.remove(updatePackets);
    };
  }, [activityRoutes, theme]);

  useEffect(() => {
    if (!mounted) return;
    let dampingTimer: TimeoutHandle | null = null;
    let pauseObserver: IntersectionObserver | null = null;

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
          dampingTimer = setTimeout(() => {
            if (globeRef.current) {
              globeRef.current.controls().enableDamping = true;
            }
          }, 100);

          // Park the WebGL loop entirely while the globe is off-screen — the
          // heaviest continuous cost on the landing page after the hero.
          if (containerRef.current) {
            pauseObserver = new IntersectionObserver(([entry]) => {
              const globe = globeRef.current;
              globeVisibleRef.current = entry.isIntersecting;
              if (!globe) return;
              if (entry.isIntersecting) globe.resumeAnimation();
              else globe.pauseAnimation();
            });
            pauseObserver.observe(containerRef.current);
          }
        }
      }
    }, 100);

    return () => {
      clearInterval(checkRef);
      if (dampingTimer) clearTimeout(dampingTimer);
      if (pauseObserver) pauseObserver.disconnect();
    };
  }, [mounted]);

  // Scroll adds angular velocity instead of mapping directly to a camera
  // position. The resulting deceleration makes trackpad direction changes
  // feel like a physical globe rather than a scroll-linked slideshow.
  useEffect(() => {
    const target = viewportTargetRef?.current;
    if (!mounted || !target) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame: number | null = null;
    let previousScrollY = window.scrollY;
    let previousTime = performance.now();
    let velocity = 0;
    let longitude = cameraRef.current.lng;
    let latitude = cameraRef.current.lat;

    const updateView = (now: number) => {
      const elapsed = Math.min(now - previousTime, 64);
      previousTime = now;
      const globe = globeRef.current;
      if (!globe) {
        frame = window.requestAnimationFrame(updateView);
        return;
      }

      const rect = target.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const isVisible = rect.top < viewportHeight && rect.bottom > 0;
      const controls = globe.controls();

      scrollGuidedRef.current = isVisible;
      if (
        isVisible &&
        !reducedMotion.matches &&
        !isDraggingRef.current &&
        !selectedProviderRef.current &&
        !isHoveringTooltipRef.current
      ) {
        controls.autoRotate = false;
        longitude += velocity * (elapsed / 16.67);
        velocity *= Math.pow(0.93, elapsed / 16.67);
        cameraRef.current = { lat: latitude, lng: longitude };
        globe.pointOfView(
          {
            lat: latitude + Math.sin((longitude * Math.PI) / 180) * 7,
            lng: longitude,
            altitude: 2.8,
          },
          0
        );
      } else if (!isVisible && !selectedProviderRef.current && !isHoveringTooltipRef.current) {
        controls.autoRotate = true;
      }

      frame = window.requestAnimationFrame(updateView);
    };

    const addScrollMomentum = () => {
      const scrollY = window.scrollY;
      const delta = scrollY - previousScrollY;
      previousScrollY = scrollY;
      if (isDraggingRef.current && Math.abs(delta) > 0.5) {
        longitude = cameraRef.current.lng;
        latitude = cameraRef.current.lat;
      }
      velocity = Math.max(-3.2, Math.min(3.2, velocity + delta * 0.012));
      if (Math.abs(delta) > 0.5) isDraggingRef.current = false;
    };

    frame = window.requestAnimationFrame(updateView);
    window.addEventListener("scroll", addScrollMomentum, { passive: true });
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", addScrollMomentum);
    };
  }, [mounted, networkCenter, viewportTargetRef]);

  useEffect(() => {
    if (!mounted || !globeRef.current) return;
    const controls = globeRef.current.controls();
    if (!controls) return;
    const breathe = gsap.to(controls, {
      autoRotateSpeed: -1.35,
      duration: 3.2,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
    });
    return () => {
      breathe.kill();
    };
  }, [mounted]);

  // The controls consume wheel events over the canvas for zoom, killing native
  // page scroll across most of the first screen; mirror the delta to the page.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const passWheelToPage = (event: WheelEvent) => {
      if (!(event.target instanceof HTMLCanvasElement)) return;
      // ctrlKey = trackpad pinch; !defaultPrevented = controls let native scroll through.
      if (event.ctrlKey || !event.defaultPrevented) return;
      const dy =
        event.deltaMode === 1
          ? event.deltaY * 16
          : event.deltaMode === 2
            ? event.deltaY * window.innerHeight
            : event.deltaY;
      window.scrollBy(0, dy);
    };

    el.addEventListener("wheel", passWheelToPage, { passive: true });
    return () => el.removeEventListener("wheel", passWheelToPage);
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
    () => new THREE.MeshBasicMaterial({ color: theme === "light" ? 0xffffff : 0x141414 }),
    [theme]
  );

  useEffect(() => {
    return () => {
      globeMaterial.dispose();
    };
  }, [globeMaterial]);

  const renderPoints = useMemo<RenderPoint[]>(() => {
    if (points.length <= 1) {
      return points.map((point) => ({
        ...point,
        plotLat: point.lat,
        plotLng: point.lng,
        plotAltitude: BASE_POINT_ALTITUDE,
        plotRadius: BASE_POINT_RADIUS,
      }));
    }

    const clustered = new Map<string, ProviderPoint[]>();
    for (const point of points) {
      const key = toClusterKey(point.lat, point.lng);
      const group = clustered.get(key);
      if (group) group.push(point);
      else clustered.set(key, [point]);
    }

    const output: RenderPoint[] = [];
    Array.from(clustered.values()).forEach((group) => {
      const ordered = [...group].sort((a, b) => a.id.localeCompare(b.id));

      if (ordered.length === 1) {
        const point = ordered[0];
        output.push({
          ...point,
          plotLat: point.lat,
          plotLng: point.lng,
          plotAltitude: BASE_POINT_ALTITUDE,
          plotRadius: BASE_POINT_RADIUS,
        });
      } else {
        output.push({
          ...ordered[0],
          plotLat: ordered[0].lat,
          plotLng: ordered[0].lng,
          plotAltitude: BASE_POINT_ALTITUDE,
          plotRadius: BASE_POINT_RADIUS,
        });
        ordered.slice(1).forEach((point, extraIndex) => {
          const ringIndex = Math.floor(extraIndex / CLUSTER_RING_CAPACITY);
          const indexInRing = extraIndex % CLUSTER_RING_CAPACITY;
          const pointsInThisRing = Math.min(
            CLUSTER_RING_CAPACITY,
            ordered.length - 1 - ringIndex * CLUSTER_RING_CAPACITY
          );
          const angle =
            pointsInThisRing > 0
              ? (2 * Math.PI * indexInRing) / pointsInThisRing
              : 0;
          const spread =
            STACK_SPREAD_DEGREES_BASE + ringIndex * STACK_SPREAD_DEGREES_STEP;
          const latitudeRadians = (point.lat * Math.PI) / 180;
          const latitudeOffset = spread * Math.cos(angle);
          const longitudeOffset =
            (spread * Math.sin(angle)) / Math.max(Math.cos(latitudeRadians), 0.35);

          output.push({
            ...point,
            plotLat: clampLatitude(point.lat + latitudeOffset),
            plotLng: wrapLongitude(point.lng + longitudeOffset),
            plotAltitude:
              BASE_POINT_ALTITUDE + (ringIndex + 1) * STACK_POINT_ALTITUDE_STEP,
            plotRadius: STACK_POINT_RADIUS,
          });
        });
      }
    });

    return output;
  }, [points]);

  const relayRenderPoints = useMemo<RelayRenderPoint[]>(
    () =>
      relayPoints.map((point) => ({
        ...point,
        plotLat: point.lat,
        plotLng: point.lng,
        plotAltitude: RELAY_POINT_ALTITUDE,
        plotRadius: RELAY_POINT_RADIUS,
      })),
    [relayPoints]
  );

  const combinedRenderPoints = useMemo<CombinedRenderPoint[]>(
    () => [...renderPoints, ...relayRenderPoints],
    [renderPoints, relayRenderPoints]
  );

  const globePoints = useMemo<Array<CombinedRenderPoint | ActivityPacket>>(
    () => [...combinedRenderPoints, ...activityPackets],
    [combinedRenderPoints, activityPackets]
  );

  const clearHideTimeout = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  if (!mounted) return null;

  const fallback = <GlobeFallback className={className} pointsCount={points.length} />;
  if (supportsWebGL === false) return fallback;

  return (
    <div 
      ref={containerRef}
      className={className}
      onMouseMove={(e) => {
        mousePosRef.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerDown={() => {
        isDraggingRef.current = true;
      }}
      onPointerUp={() => {
        if (!isDraggingRef.current || !globeRef.current) return;
        const pointOfView = globeRef.current.pointOfView();
        // Continue from the user's chosen orientation; scrolling later adds
        // momentum from this position instead of snapping back to a preset.
        if (typeof pointOfView.lng === "number") {
          cameraRef.current = { lat: pointOfView.lat, lng: pointOfView.lng };
        }
      }}
      onMouseEnter={() => {
        if (isMobile) return;
        if (globeRef.current) globeRef.current.controls().autoRotate = false;
      }}
      onMouseLeave={() => {
        if (isMobile) return;
        if (globeRef.current && !scrollGuidedRef.current && !selectedProvider && !isHoveringTooltip) {
          globeRef.current.controls().autoRotate = true;
        }
      }}
    >
      <GlobeRenderBoundary fallback={fallback}>
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
          hexPolygonColor={() => (theme === "light" ? "rgba(10, 10, 10, 0.15)" : "rgba(255, 255, 255, 0.15)")}
          pointsData={globePoints}
          pointLat={(point: object) => {
            const p = point as CombinedRenderPoint | ActivityPacket;
            return isActivityPacket(p) ? p.lat : p.plotLat;
          }}
          pointLng={(point: object) => {
            const p = point as CombinedRenderPoint | ActivityPacket;
            return isActivityPacket(p) ? p.lng : p.plotLng;
          }}
          pointRadius={(point: object) => {
            const p = point as CombinedRenderPoint | ActivityPacket;
            return isActivityPacket(p) ? p.radius : p.plotRadius;
          }}
          pointAltitude={(point: object) => {
            const p = point as CombinedRenderPoint | ActivityPacket;
            return isActivityPacket(p) ? p.altitude : p.plotAltitude;
          }}
          pointColor={(point: object) => {
            const p = point as CombinedRenderPoint | ActivityPacket;
            if (isActivityPacket(p)) return p.color;
            if (isRelayRenderPoint(p)) return theme === "light" ? RELAY_COLOR_LIGHT : RELAY_COLOR_DARK;
            return theme === "light" ? "#0a0a0a" : "#e5e5e5";
          }}
          pointLabel={() => ""}
          showAtmosphere={false}
          ringsData={combinedRenderPoints}
          ringLat={(point: object) => (point as CombinedRenderPoint).plotLat}
          ringLng={(point: object) => (point as CombinedRenderPoint).plotLng}
          ringColor={(point: object) => {
            const p = point as CombinedRenderPoint;
            const color = isRelayRenderPoint(p)
              ? theme === "light" ? "126, 34, 206" : "192, 132, 252"
              : "247, 147, 26";
            const alpha = isRelayRenderPoint(p) ? 0.26 : 0.4;
            return (t: number) => `rgba(${color}, ${(alpha * (1 - t)).toFixed(3)})`;
          }}
          ringMaxRadius={ACTIVITY_RING_MAX_RADIUS_DEG}
          ringPropagationSpeed={ACTIVITY_RING_PROPAGATION_SPEED}
          ringRepeatPeriod={ACTIVITY_RING_REPEAT_PERIOD_MS}
          arcsData={activityRoutes}
          arcStartLat={(route: object) => (route as ActivityRoute).startLat}
          arcStartLng={(route: object) => (route as ActivityRoute).startLng}
          arcEndLat={(route: object) => (route as ActivityRoute).endLat}
          arcEndLng={(route: object) => (route as ActivityRoute).endLng}
          arcColor={(route: object) => (route as ActivityRoute).color}
          arcAltitude={0.18}
          arcStroke={0.35}
          arcDashLength={0.35}
          arcDashGap={0.8}
          arcDashAnimateTime={1_500}
          onPointHover={(p: unknown) => {
            if (isMobile) return;
            clearHideTimeout();
            if (isProviderPoint(p)) {
              setSelectedProvider(buildTooltipProvider(p));
              setSelectedPos(mousePosRef.current);
              if (globeRef.current) globeRef.current.controls().autoRotate = false;
            } else {
              hideTimeoutRef.current = setTimeout(() => {
                if (!isHoveringTooltip) {
                  setSelectedProvider(null);
                  setSelectedPos(null);
                  if (globeRef.current && !scrollGuidedRef.current && !containerRef.current?.matches(':hover')) {
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
              setSelectedPos(mousePosRef.current);
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
            if (globeRef.current && !scrollGuidedRef.current) globeRef.current.controls().autoRotate = true;
          }}
        />
      </GlobeRenderBoundary>
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
          if (globeRef.current && !scrollGuidedRef.current && !containerRef.current?.matches(':hover')) {
            globeRef.current.controls().autoRotate = true;
          }
        }}
      />
    </div>
  );
}
