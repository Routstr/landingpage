"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { gsap, useGSAP } from "@/lib/gsap";
import {
  ROUTSTR_MARK_BAR_PATH,
  ROUTSTR_MARK_BAR_ROTATION,
  ROUTSTR_MARK_PATH,
} from "@/lib/brand";
import { cn } from "@/lib/utils";

interface ConceptObjectProps {
  /** 0 = Permissionless, 1 = Decentralized, 2 = Private */
  stateIndex: number;
  className?: string;
  /** Fired when this visual phase reaches its designed handoff seam. */
  onPhaseComplete?: (phaseIndex: number) => void;
}

const FRAGMENT_COUNT = 16;
const PRIMARY_FRAGMENT_COUNT = 9;
const FRAGMENT_RADIUS = 0.18;

const FRAGMENT_COLOR_LIGHT = 0x0a0a0a;
const FRAGMENT_COLOR_DARK = 0xffffff;
const DARK_FRAGMENT_EMISSIVE = 0x808080;
const FRAGMENT_FILL_OPACITY = 0.9;
const DARK_FRAGMENT_FILL_OPACITY = 0.98;
const FRAGMENT_EDGE_OPACITY = 0.55;

const HIGHLIGHT_FRAGMENT_INDEX = 0;
const HIGHLIGHT_FILL_OPACITY = 0.92;
const HIGHLIGHT_EDGE_OPACITY = 0.95;

// Framing: camera distance derives from FOV + worst-case vertical extent.
// Desktop pulls in close; mobile comes closer still — side overflow on phones
// is intentional and reads as energy bleeding off-screen.
const FOV = 35;
const FRAME_HALF_H = 1.7;
const MOBILE_Z = 4.2;

const SCATTERED_RADIUS = 0.92;

// Defense field in the Private state — snug around the lone orange node.
const SHIELD_RADIUS = 0.36;
const SHIELD_FILL_OPACITY = 0.1;
const SHIELD_WIRE_OPACITY = 0.3;

// Permissionless portal — a flat luminous ring that laser-draws itself into
// existence. Every node streams through it on the z axis.
const PORTAL_RADIUS = 0.34;
const PORTAL_INNER_RADIUS = 0.3;
const PORTAL_OUTER_RADIUS = 0.48;
const PORTAL_ECHO_RADIUS = 0.25;
const PORTAL_OPACITY = 0.65;
const PORTAL_FILL_OPACITY = 0.07;
const PORTAL_OUTER_OPACITY = 0.22;
const PORTAL_ECHO_OPACITY = 0.34;
const PORTAL_RAY_OPACITY = 0.16;
const PORTAL_GLOW_OPACITY = 0.1;
const THROUGH_Z = -1.35;
// Perfect-circle formation the cluster holds around the open portal.
const FORMATION_RADIUS = 0.88;
const FORMATION_Z = 0.55;

function nodeScale(index: number): number {
  return index < PRIMARY_FRAGMENT_COUNT ? 1 : 0.58;
}

function currentThemeColor(): number {
  if (typeof document === "undefined") return FRAGMENT_COLOR_DARK;
  return document.documentElement.classList.contains("dark")
    ? FRAGMENT_COLOR_DARK
    : FRAGMENT_COLOR_LIGHT;
}

function currentFragmentFillOpacity(): number {
  return currentThemeColor() === FRAGMENT_COLOR_DARK
    ? DARK_FRAGMENT_FILL_OPACITY
    : FRAGMENT_FILL_OPACITY;
}

function applyFragmentTheme(material: THREE.MeshStandardMaterial, color: number): void {
  const isDarkFragment = color === FRAGMENT_COLOR_DARK;
  material.color.setHex(color);
  material.emissive.setHex(isDarkFragment ? DARK_FRAGMENT_EMISSIVE : 0x000000);
}

function currentShieldColor(): number {
  return currentThemeColor();
}

function fibonacciDirections(count: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    points.push(
      new THREE.Vector3(Math.cos(theta) * radiusAtY, y, Math.sin(theta) * radiusAtY)
    );
  }
  return points;
}

const DIRECTIONS = fibonacciDirections(FRAGMENT_COUNT);
const CONNECTION_ORDER = Array.from({ length: FRAGMENT_COUNT }, (_, index) => index)
  .sort((a, b) => Math.atan2(DIRECTIONS[a].y, DIRECTIONS[a].x) - Math.atan2(DIRECTIONS[b].y, DIRECTIONS[b].x));
const CONNECTION_EDGES = CONNECTION_ORDER.map((from, index) => [
  from,
  CONNECTION_ORDER[(index + 1) % CONNECTION_ORDER.length],
] as const);

function scatteredTargetFor(index: number): THREE.Vector3 {
  const extraRadius = index < PRIMARY_FRAGMENT_COUNT
    ? 0
    : 0.2 + ((index - PRIMARY_FRAGMENT_COUNT) % 3) * 0.07;
  return DIRECTIONS[index].clone().multiplyScalar(SCATTERED_RADIUS + extraRadius);
}

// Ordered polyline → invisible-until-drawn LineSegments. Progressive
// drawRange is the "laser draw" reveal used by the portal ring.
function polyline(points: number[][], material: THREE.Material): THREE.LineSegments {
  const verts: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    verts.push(points[i][0], points[i][1], 0, points[i + 1][0], points[i + 1][1], 0);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(verts), 3));
  geom.setDrawRange(0, 0);
  const ls = new THREE.LineSegments(geom, material);
  ls.userData.totalVerts = verts.length / 3;
  return ls;
}

function circlePoints(cx: number, cy: number, r: number, n: number): number[][] {
  const pts: number[][] = [];
  for (let k = 0; k <= n; k++) {
    const a = (k / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

function radialSegments(count: number, inner: number, outer: number, material: THREE.Material): THREE.LineSegments {
  const verts: number[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    verts.push(inner * cos, inner * sin, 0, outer * cos, outer * sin, 0);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(verts), 3));
  return new THREE.LineSegments(geom, material);
}

// Perfect-circle formation the cluster holds around the open portal —
// evenly spaced by index, like swimmers before the dive.
function slotFor(gi: number): THREE.Vector3 {
  const a = (gi / FRAGMENT_COUNT) * Math.PI * 2 - Math.PI / 2;
  return new THREE.Vector3(
    Math.cos(a) * FORMATION_RADIUS,
    Math.sin(a) * FORMATION_RADIUS,
    FORMATION_Z
  );
}

function makeRoutstrMarkTexture(): THREE.CanvasTexture {
  const s = 256;
  const canvas = document.createElement("canvas");
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f2ebdd";
  ctx.save();
  ctx.scale(s / 32, s / 32);
  ctx.fill(new Path2D(ROUTSTR_MARK_PATH), "evenodd");
  ctx.translate(16, 16);
  ctx.rotate((ROUTSTR_MARK_BAR_ROTATION * Math.PI) / 180);
  ctx.translate(-16, -16);
  ctx.fill(new Path2D(ROUTSTR_MARK_BAR_PATH));
  ctx.restore();
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function ConceptObject({ stateIndex, className, onPhaseComplete }: ConceptObjectProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const fragmentsRef = useRef<THREE.Mesh[]>([]);
  const edgeMaterialsRef = useRef<THREE.LineBasicMaterial[]>([]);
  const portalGroupRef = useRef<THREE.Group | null>(null);
  const portalMaterialsRef = useRef<THREE.Material[]>([]);
  const portalRingRef = useRef<THREE.LineSegments | null>(null);
  const portalRingsRef = useRef<THREE.LineSegments[]>([]);
  const portalShellsRef = useRef<THREE.Mesh[]>([]);
  const connectionLinesRef = useRef<THREE.LineSegments | null>(null);
  const connectionMaterialRef = useRef<THREE.LineBasicMaterial | null>(null);
  const connectionGeometryRef = useRef<THREE.BufferGeometry | null>(null);
  const shieldGroupRef = useRef<THREE.Group | null>(null);
  const shieldMaterialsRef = useRef<THREE.Material[]>([]);
  const routstrMarkMatRef = useRef<THREE.SpriteMaterial | null>(null);
  const portalTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const isPrivateRef = useRef(false);
  const isPortalStateRef = useRef(false);
  const breathTweensRef = useRef<(gsap.core.Tween | gsap.core.Timeline)[]>([]);
  const introDoneRef = useRef(false);
  const seedBurstRef = useRef(false);
  const onPhaseCompleteRef = useRef(onPhaseComplete);
  const layoutRef = useRef({ offset: 0, entryX: -1.8, edgeX: 2.6, edgeY: 1.8, z: MOBILE_Z });

  useEffect(() => {
    onPhaseCompleteRef.current = onPhaseComplete;
  }, [onPhaseComplete]);

  // ── Mount: scene, renderer, geometry, materials, RAF, resize, theme. ──
  useGSAP(
    () => {
      const mount = mountRef.current;
      if (!mount) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 40);
      camera.position.set(0, 0, MOBILE_Z);

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      mount.appendChild(renderer.domElement);

      const group = new THREE.Group();
      scene.add(group);
      groupRef.current = group;

      scene.add(new THREE.AmbientLight(0xffffff, 0.55));
      const key = new THREE.DirectionalLight(0xffffff, 1.1);
      key.position.set(2, 2, 3);
      scene.add(key);

      let themeColor = currentThemeColor();

      const geometry = new THREE.IcosahedronGeometry(FRAGMENT_RADIUS, 0);

      // Solid body + crisp polyhedron-edge outline — the glass-panel look.
      const routstrTexture = makeRoutstrMarkTexture();
      const routstrMarkMaterial = new THREE.SpriteMaterial({
        map: routstrTexture,
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
      });
      const routstrMarkSprite = new THREE.Sprite(routstrMarkMaterial);
      routstrMarkSprite.scale.set(0.28, 0.28, 1);
      routstrMarkSprite.renderOrder = 12;
      routstrMarkMatRef.current = routstrMarkMaterial;

      const edgeGeometry = new THREE.EdgesGeometry(geometry);
      const edgeMaterials: THREE.LineBasicMaterial[] = [];
      const fragments = DIRECTIONS.map((dir, i) => {
        const fillMaterial = new THREE.MeshStandardMaterial({
          color: themeColor,
          flatShading: true,
          roughness: 0.35,
          metalness: 0.2,
          emissive: themeColor === FRAGMENT_COLOR_DARK ? DARK_FRAGMENT_EMISSIVE : 0x000000,
          transparent: true,
          opacity: currentFragmentFillOpacity(),
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(geometry, fillMaterial);

        const edgeMaterial = new THREE.LineBasicMaterial({
          color: themeColor,
          transparent: true,
          opacity: FRAGMENT_EDGE_OPACITY,
          depthWrite: false,
        });
        const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        mesh.add(edgeLines);
        edgeMaterials.push(edgeMaterial);

        if (i === HIGHLIGHT_FRAGMENT_INDEX) mesh.add(routstrMarkSprite);

        // Born dormant at the seed point — the state choreography reveals
        // them, so the prewarm frame can never flash a stale layout.
        mesh.position.set(0, 0, 0);
        mesh.scale.setScalar(0.18);
        mesh.userData.index = i;
        group.add(mesh);
        return mesh;
      });
      fragmentsRef.current = fragments;
      edgeMaterialsRef.current = edgeMaterials;

      const connectionPositions = new Float32Array(CONNECTION_EDGES.length * 6);
      const connectionGeometry = new THREE.BufferGeometry();
      const connectionAttribute = new THREE.BufferAttribute(connectionPositions, 3);
      connectionGeometry.setAttribute("position", connectionAttribute);
      connectionGeometry.setDrawRange(0, 0);
      const connectionMaterial = new THREE.LineBasicMaterial({
        color: themeColor,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const connectionLines = new THREE.LineSegments(connectionGeometry, connectionMaterial);
      connectionLines.renderOrder = 6;
      connectionLines.visible = false;
      group.add(connectionLines);
      connectionLinesRef.current = connectionLines;
      connectionMaterialRef.current = connectionMaterial;
      connectionGeometryRef.current = connectionGeometry;

      // Permissionless portal: a nested wireframe vault stretches into an
      // aperture, with rings retained as the sharp edge of the opening.
      const portalGroup = new THREE.Group();
      const ringMaterial = new THREE.LineBasicMaterial({
        color: themeColor,
        transparent: true,
        opacity: PORTAL_OPACITY,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const ring = polyline(circlePoints(0, 0, PORTAL_RADIUS, 64), ringMaterial);
      ring.renderOrder = 11;
      const outerRingMaterial = new THREE.LineBasicMaterial({
        color: themeColor,
        transparent: true,
        opacity: PORTAL_OUTER_OPACITY,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const outerRing = polyline(circlePoints(0, 0, PORTAL_OUTER_RADIUS, 64), outerRingMaterial);
      outerRing.renderOrder = 10;
      const echoRingMaterial = new THREE.LineBasicMaterial({
        color: themeColor,
        transparent: true,
        opacity: PORTAL_ECHO_OPACITY,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const echoRing = polyline(circlePoints(0, 0, PORTAL_ECHO_RADIUS, 48), echoRingMaterial);
      echoRing.renderOrder = 12;
      const rayMaterial = new THREE.LineBasicMaterial({
        color: themeColor,
        transparent: true,
        opacity: PORTAL_RAY_OPACITY,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const rays = radialSegments(18, PORTAL_RADIUS * 1.08, PORTAL_OUTER_RADIUS * 0.9, rayMaterial);
      rays.renderOrder = 9;
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: themeColor,
        transparent: true,
        opacity: PORTAL_GLOW_OPACITY,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const glow = new THREE.Mesh(new THREE.CircleGeometry(PORTAL_OUTER_RADIUS * 0.95, 64), glowMaterial);
      glow.position.z = -0.03;
      glow.renderOrder = 8;
      const discMaterial = new THREE.MeshBasicMaterial({
        color: themeColor,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const disc = new THREE.Mesh(new THREE.CircleGeometry(PORTAL_INNER_RADIUS, 48), discMaterial);
      disc.position.z = -0.02;
      disc.renderOrder = 9;
      const shellGeometry = new THREE.SphereGeometry(PORTAL_OUTER_RADIUS, 18, 12);
      const portalShells = [0.78, 1, 1.24].map((scale, index) => {
        const material = new THREE.MeshBasicMaterial({
          color: themeColor,
          wireframe: true,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const shell = new THREE.Mesh(shellGeometry, material);
        shell.scale.set(scale, scale, 0.26 + index * 0.12);
        shell.position.z = -0.1 - index * 0.08;
        shell.renderOrder = 7 - index;
        return shell;
      });
      portalShells.forEach((shell) => portalGroup.add(shell));
      portalGroup.add(glow);
      portalGroup.add(rays);
      portalGroup.add(outerRing);
      portalGroup.add(ring);
      portalGroup.add(echoRing);
      portalGroup.add(disc);
      portalGroup.visible = false;
      group.add(portalGroup);
      portalGroupRef.current = portalGroup;
      portalRingRef.current = ring;
      portalRingsRef.current = [ring, outerRing, echoRing];
      portalShellsRef.current = portalShells;
      portalMaterialsRef.current = [
        ringMaterial,
        discMaterial,
        outerRingMaterial,
        echoRingMaterial,
        rayMaterial,
        glowMaterial,
        ...portalShells.map((shell) => shell.material as THREE.MeshBasicMaterial),
      ];

      // Private-state force field: a monochrome sphere hugging the lone
      // highlight node — back-side fill for the fresnel rim, wire cage above.
      const shieldGroup = new THREE.Group();
      const shieldGeometry = new THREE.SphereGeometry(SHIELD_RADIUS, 24, 16);
      const shieldFillMaterial = new THREE.MeshBasicMaterial({
        color: currentShieldColor(),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.BackSide,
      });
      const shieldFill = new THREE.Mesh(shieldGeometry, shieldFillMaterial);
      const shieldWireMaterial = new THREE.MeshBasicMaterial({
        color: currentShieldColor(),
        wireframe: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const shieldWire = new THREE.Mesh(shieldGeometry, shieldWireMaterial);
      shieldGroup.add(shieldFill);
      shieldGroup.add(shieldWire);
      shieldGroup.visible = false;
      shieldGroup.scale.set(0.6, 0.6, 0.6);
      group.add(shieldGroup);
      shieldGroupRef.current = shieldGroup;
      shieldMaterialsRef.current = [shieldFillMaterial, shieldWireMaterial];

      const themeObserver = new MutationObserver(() => {
        const next = currentThemeColor();
        if (next === themeColor) return;
        themeColor = next;
        fragments.forEach((mesh, i) => {
          if (isPrivateRef.current && i === HIGHLIGHT_FRAGMENT_INDEX) return;
          applyFragmentTheme(mesh.material as THREE.MeshStandardMaterial, next);
        });
        edgeMaterials.forEach((mat, i) => {
          if (isPrivateRef.current && i === HIGHLIGHT_FRAGMENT_INDEX) return;
          mat.color.setHex(next);
        });
        connectionMaterial.color.setHex(next);
        ringMaterial.color.setHex(next);
        discMaterial.color.setHex(next);
        outerRingMaterial.color.setHex(next);
        echoRingMaterial.color.setHex(next);
        rayMaterial.color.setHex(next);
        glowMaterial.color.setHex(next);
        portalShells.forEach((shell) => {
          (shell.material as THREE.MeshBasicMaterial).color.setHex(next);
        });
        shieldFillMaterial.color.setHex(currentShieldColor());
        shieldWireMaterial.color.setHex(currentShieldColor());
      });
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });

      let raf = 0;
      let pausedForVisibility = false;

      const handleVisibilityChange = () => {
        if (document.hidden) {
          if (!gsap.globalTimeline.paused()) {
            gsap.globalTimeline.pause();
            pausedForVisibility = true;
          }
          if (raf) {
            cancelAnimationFrame(raf);
            raf = 0;
          }
        } else if (pausedForVisibility) {
          gsap.globalTimeline.resume();
          pausedForVisibility = false;
          if (!raf) raf = requestAnimationFrame(renderLoop);
        }
      };

      const renderLoop = () => {
        if (document.hidden) {
          raf = 0;
          return;
        }
        // Fragments tumble individually via tweens; the group itself never
        // rotates — a tilting group folds the flat ring circle into an
        // ellipse on screen, which read as the broken "S".
        if (shieldGroup.visible) {
          shieldWire.rotation.y += 0.0035;
          shieldWire.rotation.x += 0.0012;
        }

        for (let edgeIndex = 0; edgeIndex < CONNECTION_EDGES.length; edgeIndex++) {
          const [from, to] = CONNECTION_EDGES[edgeIndex];
          const fromPosition = fragments[from].position;
          const toPosition = fragments[to].position;
          const offset = edgeIndex * 6;
          connectionPositions[offset] = fromPosition.x;
          connectionPositions[offset + 1] = fromPosition.y;
          connectionPositions[offset + 2] = fromPosition.z;
          connectionPositions[offset + 3] = toPosition.x;
          connectionPositions[offset + 4] = toPosition.y;
          connectionPositions[offset + 5] = toPosition.z;
        }
        connectionAttribute.needsUpdate = true;

        renderer.render(scene, camera);
        raf = requestAnimationFrame(renderLoop);
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);
      handleVisibilityChange();
      if (!document.hidden) raf = requestAnimationFrame(renderLoop);

      const resize = () => {
        const cw = mount.clientWidth;
        const ch = mount.clientHeight;
        if (!cw || !ch) return;
        const aspect = cw / ch;
        const isDesktop = cw >= 768;

        const tanHalf = Math.tan((FOV / 2) * (Math.PI / 180));
        const z = isDesktop ? FRAME_HALF_H / tanHalf : MOBILE_Z;
        // Desktop: park the portal exactly at the centre of the right half of
        // the viewport (half of the visible width). Mobile: dead centre —
        // side overflow there is intentional.
        const offset = isDesktop ? (z * tanHalf * aspect) / 2 : 0;

        camera.aspect = aspect;
        camera.position.z = z;
        camera.updateProjectionMatrix();
        group.position.x = offset;
        renderer.setSize(cw, ch);
        // Where "off-screen" sits in group space at the formation plane —
        // used to send divers away and bring them back from beyond the edges.
        const dist = z - FORMATION_Z;
        layoutRef.current = {
          offset,
          entryX: -(offset + 1.3),
          edgeX: offset + dist * tanHalf * aspect + 0.5,
          edgeY: dist * tanHalf + 0.5,
          z,
        };
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(mount);

      return () => {
        cancelAnimationFrame(raf);
        if (pausedForVisibility) gsap.globalTimeline.resume();
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        breathTweensRef.current.forEach((t) => t.kill());
        breathTweensRef.current = [];
        portalTimelineRef.current?.kill();
        observer.disconnect();
        themeObserver.disconnect();
        geometry.dispose();
        edgeGeometry.dispose();
        routstrTexture.dispose();
        routstrMarkMaterial.dispose();
        ringMaterial.dispose();
        discMaterial.dispose();
        outerRingMaterial.dispose();
        echoRingMaterial.dispose();
        rayMaterial.dispose();
        glowMaterial.dispose();
        shellGeometry.dispose();
        portalShells.forEach((shell) => (shell.material as THREE.Material).dispose());
        ring.geometry.dispose();
        outerRing.geometry.dispose();
        echoRing.geometry.dispose();
        rays.geometry.dispose();
        disc.geometry.dispose();
        glow.geometry.dispose();
        connectionGeometry.dispose();
        connectionMaterial.dispose();
        shieldGeometry.dispose();
        shieldFillMaterial.dispose();
        shieldWireMaterial.dispose();
        fragments.forEach((f) => (f.material as THREE.Material).dispose());
        edgeMaterials.forEach((mat) => mat.dispose());
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      };
    },
    { scope: mountRef }
  );

  // ── State choreography, re-run on every word/state change. ──
  useGSAP(
    () => {
      const fragments = fragmentsRef.current;
      const edgeMaterials = edgeMaterialsRef.current;
      if (!fragments.length || !edgeMaterials.length) return;

      const isPrivate = stateIndex === 2;
      const isPermissionless = stateIndex === 0;
      isPrivateRef.current = isPrivate;
      isPortalStateRef.current = isPermissionless;

      // Kill running choreography WITHOUT snapping — every retarget below
      // picks up from wherever each fragment happens to be mid-flight.
      breathTweensRef.current.forEach((t) => t.kill());
      breathTweensRef.current = [];
      if (portalTimelineRef.current) {
        portalTimelineRef.current.kill();
        portalTimelineRef.current = null;
      }

      const portal = portalGroupRef.current!;
      const portalMats = portalMaterialsRef.current;
      const shield = shieldGroupRef.current;
      const shieldMats = shieldMaterialsRef.current;
      const routstrMarkMat = routstrMarkMatRef.current;
      const connectionLines = connectionLinesRef.current;
      const connectionMaterial = connectionMaterialRef.current;
      const connectionGeometry = connectionGeometryRef.current;

      fragments.forEach((mesh) => {
        const gi = mesh.userData.index as number;
        gsap.killTweensOf(mesh.position);
        gsap.killTweensOf(mesh.rotation);
        gsap.killTweensOf(mesh.scale);
        gsap.killTweensOf(mesh.material);
        gsap.killTweensOf(edgeMaterials[gi]);
      });
      portalMats.forEach((material) => gsap.killTweensOf(material));
      if (connectionMaterial) gsap.killTweensOf(connectionMaterial);
      gsap.killTweensOf(portal.scale);
      if (shield) {
        gsap.killTweensOf(shield.scale);
        shieldMats.forEach((material) => gsap.killTweensOf(material));
      }
      if (routstrMarkMat) gsap.killTweensOf(routstrMarkMat);

      const highlight = fragments[HIGHLIGHT_FRAGMENT_INDEX];
      const highlightMat = highlight.material as THREE.MeshStandardMaterial;
      const highlightEdge = edgeMaterials[HIGHLIGHT_FRAGMENT_INDEX];

      // Leaving the portal scene: fade the ring and membrane out gracefully
      // instead of snapping them off — the seam stays continuous.
      const fadePortalOut = () => {
        const out = gsap.to(portalMats, {
          opacity: 0, duration: 0.35, ease: "power1.in", overwrite: "auto",
          onComplete: () => { portal.visible = false; },
        });
        breathTweensRef.current.push(out);
      };

      if (routstrMarkMat) {
        gsap.to(routstrMarkMat, {
          opacity: isPrivate ? 1 : 0,
          duration: isPrivate ? 0.45 : 0.25,
          ease: "power2.out",
          overwrite: "auto",
        });
      }

      if (isPrivate) {
        // ── PRIVATE ── every node converges into the protected center node.
        fadePortalOut();
        if (connectionLines && connectionGeometry && connectionMaterial) {
          connectionLines.visible = false;
          connectionGeometry.setDrawRange(0, 0);
          gsap.set(connectionMaterial, { opacity: 0 });
        }

        gsap.to(highlight.position, { x: 0, y: 0, z: 0, duration: 0.8, ease: "power3.out", overwrite: "auto" });
        gsap.to(highlight.scale, { x: 1.25, y: 1.25, z: 1.25, duration: 0.6, ease: "back.out(1.7)", overwrite: "auto" });
        applyFragmentTheme(highlightMat, currentThemeColor());
        highlightEdge.color.setHex(currentThemeColor());
        gsap.to(highlightMat, { opacity: HIGHLIGHT_FILL_OPACITY, duration: 0.6, ease: "power2.out", overwrite: "auto" });
        gsap.to(highlightEdge, { opacity: HIGHLIGHT_EDGE_OPACITY, duration: 0.6, ease: "power2.out", overwrite: "auto" });

        if (shield) {
          shield.position.set(0, 0, 0);
          const shieldArrivalAt = 1.82;
          const shieldArrival = gsap.delayedCall(shieldArrivalAt, () => {
            shield.visible = true;
            gsap.to(shield.scale, { x: 1, y: 1, z: 1, duration: 0.7, ease: "back.out(1.4)", overwrite: "auto" });
            gsap.to(shieldMats![0], { opacity: SHIELD_FILL_OPACITY, duration: 0.6, ease: "power2.out", overwrite: "auto" });
            gsap.to(shieldMats![1], { opacity: SHIELD_WIRE_OPACITY, duration: 0.6, ease: "power2.out", overwrite: "auto" });
          });
          breathTweensRef.current.push(shieldArrival);
        }

        fragments.forEach((mesh) => {
          const gi = mesh.userData.index as number;
          if (gi === HIGHLIGHT_FRAGMENT_INDEX) return;
          const mat = mesh.material as THREE.MeshStandardMaterial;
          const edge = edgeMaterials[gi];
          const delay = 0.18 + gi * 0.055;
          const size = nodeScale(gi);
          applyFragmentTheme(mat, currentThemeColor());
          edge.color.setHex(currentThemeColor());
          gsap.to(mesh.position, {
            x: 0, y: 0, z: 0.015,
            duration: 0.95, ease: "power2.inOut", delay, overwrite: "auto",
          });
          gsap.to(mesh.scale, {
            x: size * 0.1, y: size * 0.1, z: size * 0.1,
            duration: 0.72, ease: "power3.in", delay: delay + 0.18, overwrite: "auto",
          });
          gsap.to(mat, { opacity: 0.12, duration: 0.42, ease: "power2.in", delay: delay + 0.52, overwrite: "auto" });
          gsap.to(edge, { opacity: 0.1, duration: 0.42, ease: "power2.in", delay: delay + 0.52, overwrite: "auto" });
          gsap.to(mesh.rotation, {
            x: mesh.rotation.x + Math.PI * (1 + (gi % 3)),
            y: mesh.rotation.y + Math.PI * (2 + (gi % 2)),
            duration: 1.0, ease: "power2.out", overwrite: "auto", delay,
          });
        });
          const phaseComplete = gsap.delayedCall(2.1, () => onPhaseCompleteRef.current?.(2));
        breathTweensRef.current.push(phaseComplete);
      } else if (isPermissionless) {
        // ── PERMISSIONLESS ── cluster scatters around the portal, the ring
        // laser-draws itself in, nodes stream through one by one on the z
        // axis… then the portal closes by shrinking into a dot.
        if (connectionLines && connectionGeometry && connectionMaterial) {
          connectionLines.visible = false;
          connectionGeometry.setDrawRange(0, 0);
          gsap.set(connectionMaterial, { opacity: 0 });
        }
        portal.visible = false;
        gsap.set(portalMats, { opacity: 0 });

        const resetPortal = () => {
          portal.visible = true;
          gsap.set(portal.scale, { x: 1, y: 1, z: 1 });
          gsap.set(portalMats[0], { opacity: PORTAL_OPACITY });
          gsap.set(portalMats[1], { opacity: PORTAL_FILL_OPACITY });
          gsap.set(portalMats[2], { opacity: PORTAL_OUTER_OPACITY });
          gsap.set(portalMats[3], { opacity: PORTAL_ECHO_OPACITY });
          gsap.set(portalMats[4], { opacity: PORTAL_RAY_OPACITY });
          gsap.set(portalMats[5], { opacity: PORTAL_GLOW_OPACITY });
          portalShellsRef.current.forEach((shell, index) => {
            gsap.set(shell.scale, { x: 0.18 + index * 0.06, y: 0.18 + index * 0.06, z: 0.08 });
            gsap.set(shell.material, { opacity: 0 });
          });
          portalRingsRef.current.forEach((portalRing) => portalRing.geometry.setDrawRange(0, 0));
        };

        const startLoop = (delay: number) => {
          const tl = gsap.timeline({ delay });
          portalTimelineRef.current = tl;

          tl.call(() => {
            resetPortal();
          }, undefined, 0);
          const portalRings = portalRingsRef.current;
          const draw = { p: 0 };
          tl.to(draw, {
            p: 1,
            duration: 0.35,
            ease: "power1.inOut",
            onUpdate: () => portalRings.forEach((portalRing) => {
              const total = portalRing.userData.totalVerts as number;
              portalRing.geometry.setDrawRange(0, Math.round(draw.p * total));
            }),
          }, 0);
          tl.fromTo(
            portal.scale,
            { x: 0.78, y: 0.78, z: 1 },
            { x: 1, y: 1, z: 1, duration: 0.35, ease: "back.out(1.7)" },
            0
          );
          tl.to(portalMats[1], { opacity: PORTAL_FILL_OPACITY * 1.8, duration: 0.18, yoyo: true, repeat: 1 }, 0.18);
          tl.to(portalMats[4], { opacity: PORTAL_RAY_OPACITY * 1.8, duration: 0.14, yoyo: true, repeat: 1 }, 0.19);
          tl.to(portalMats[5], { opacity: PORTAL_GLOW_OPACITY * 1.8, duration: 0.23, yoyo: true, repeat: 1 }, 0.16);
          portalShellsRef.current.forEach((shell, index) => {
            const scale = 0.78 + index * 0.23;
            tl.to(shell.scale, { x: scale, y: scale, z: 0.28 + index * 0.12, duration: 0.32, ease: "power3.out" }, index * 0.055);
            tl.to(shell.material, { opacity: 0.17 - index * 0.025, duration: 0.2, ease: "power2.out" }, index * 0.055 + 0.06);
          });

          // Beat 2 — synchronised swimming: nodes peel off toward the exact
          // centre, roll as they dive through, shrink into the distance and
          // vanish. Peel order jumps around the ring so the REMAINING shape
          // stays balanced — peeling in index order leaves a rotating arc
          // that reads as an S. They stay gone until the loop resets.
          const PEEL_ORDER = CONNECTION_ORDER;
          const DIVE_START = 0.48;
          const DIVE_STAGGER = 0.09;
          PEEL_ORDER.forEach((gi, k) => {
            const mesh = fragments[gi];
            const at = DIVE_START + k * DIVE_STAGGER;
            const size = nodeScale(gi);
            tl.to(mesh.position, { x: 0, y: 0, duration: 0.13, ease: "power1.inOut" }, at);
            tl.to(mesh.position, { z: THROUGH_Z, duration: 0.26, ease: "power2.in" }, at + 0.07);
            tl.to(mesh.rotation, { z: `+=${Math.PI * 2}`, duration: 0.26, ease: "power1.in" }, at + 0.07);
            tl.to(mesh.scale, { x: size * 0.32, y: size * 0.32, z: size * 0.32, duration: 0.23, ease: "power2.in" }, at + 0.09);
            tl.to(mesh.material, { opacity: 0, duration: 0.06, ease: "power1.in" }, at + 0.23);
            tl.to(edgeMaterials[gi], { opacity: 0, duration: 0.06, ease: "power1.in" }, at + 0.23);
          });

          // Once the final ordinary node clears the ring, the portal closes
          // on its own. No special node is allowed to interrupt the circle.
          const lastDiveAt = DIVE_START + (PEEL_ORDER.length - 1) * DIVE_STAGGER;
          const lastDiveCleared = lastDiveAt + 0.07 + 0.26 + 0.06;
          const tD = lastDiveCleared + 0.06;

          const undraw = { p: 1 };
          tl.to(undraw, {
            p: 0,
            duration: 0.17,
            ease: "power2.inOut",
            onUpdate: () => portalRings.forEach((portalRing) => {
              const total = portalRing.userData.totalVerts as number;
              portalRing.geometry.setDrawRange(0, Math.round(undraw.p * total));
            }),
          }, tD);
          // Seal the vault in the inverse of its opening: the outer shell
          // folds in first, then each inner layer follows into the aperture.
          const shellsClosing = [...portalShellsRef.current].reverse();
          shellsClosing.forEach((shell, reverseIndex) => {
            const closeAt = tD + reverseIndex * 0.055;
            tl.to(shell.scale, { x: 0.18, y: 0.18, z: 0.08, duration: 0.32, ease: "power3.in" }, closeAt);
            tl.to(shell.material, { opacity: 0, duration: 0.2, ease: "power2.in" }, closeAt + 0.1);
          });
          tl.to(portalMats.slice(0, 6), { opacity: 0, duration: 0.18, ease: "power2.in" }, tD + 0.12);
          tl.to(portal.scale, { x: 0.02, y: 0.02, z: 1, duration: 0.32, ease: "power3.in" }, tD + 0.08);
          tl.call(() => { portal.visible = false; }, undefined, tD + 0.48);

          const seedHandoffAt = tD + 0.32;
          const seedStartAt = tD + 0.5;
          fragments.forEach((mesh) => {
            tl.to(mesh.position, { x: 0, y: 0, z: 0, duration: 0.16, ease: "power2.inOut" }, seedHandoffAt);
            tl.to(mesh.material, { opacity: 0, duration: 0.12, ease: "power2.in" }, seedHandoffAt);
            tl.to(edgeMaterials[mesh.userData.index as number], { opacity: 0, duration: 0.12, ease: "power2.in" }, seedHandoffAt);
          });

          // The portal scene hands directly into the Decentralized seed burst.
          // Every fragment is already hidden at the shared origin before the
          // next state mounts, so the loop never snaps at this seam.
          let transitionFired = false;
          tl.call(() => {
            if (transitionFired) return;
            transitionFired = true;
            seedBurstRef.current = true;
            onPhaseCompleteRef.current?.(0);
          }, undefined, seedStartAt);
        };

        // Re-entry from another state is always a plain continuous crossfade
        // into formation — page load starts on Decentralized, so this scene
        // never owns the intro.
        {
          const crossfade = gsap.timeline();
          fragments.forEach((mesh) => {
            const gi = mesh.userData.index as number;
            const slot = slotFor(gi);
            const mat = mesh.material as THREE.MeshStandardMaterial;
            const edge = edgeMaterials[gi];
            const size = nodeScale(gi);
            crossfade.to(mesh.position, {
              x: slot.x, y: slot.y, z: slot.z,
              duration: 0.35, ease: "power2.inOut",
            }, gi * 0.015);
            // Scale too — a diver killed mid-dive arrives at 0.32× and wrecks
            // the circle if left behind.
            crossfade.to(mesh.scale, { x: size, y: size, z: size, duration: 0.25, ease: "power2.out" }, gi * 0.015);
            crossfade.to(mat, { opacity: currentFragmentFillOpacity(), duration: 0.25 }, gi * 0.015);
            crossfade.to(edge, { opacity: FRAGMENT_EDGE_OPACITY, duration: 0.25 }, gi * 0.015);
          });
          crossfade.call(() => {
            resetPortal();
            startLoop(0.025);
          });
          breathTweensRef.current.push(crossfade);
        }
      } else {
        // ── DECENTRALIZED ── page load bursts every shape out of one single
        // seed; later visits burst outward into a floating constellation,
        // every fragment tumbling onto its own axis, gently breathing.
        const firstLoad = !introDoneRef.current || seedBurstRef.current;
        introDoneRef.current = true;
        seedBurstRef.current = false;

        if (firstLoad) {
          // A compact version of the vault opens behind the seed point only.
          // Fragment motion begins on its existing schedule; this is scenery.
          portal.visible = true;
          gsap.set(portal.scale, { x: 0.16, y: 0.16, z: 1 });
          gsap.set(portalMats.slice(0, 6), {
            opacity: (index: number) => [PORTAL_OPACITY, PORTAL_FILL_OPACITY, PORTAL_OUTER_OPACITY, PORTAL_ECHO_OPACITY, PORTAL_RAY_OPACITY, PORTAL_GLOW_OPACITY][index],
          });
          portalRingsRef.current.forEach((portalRing) => portalRing.geometry.setDrawRange(0, 0));
          portalShellsRef.current.forEach((shell) => {
            gsap.set(shell.scale, { x: 0.06, y: 0.06, z: 0.03 });
            gsap.set(shell.material, { opacity: 0 });
          });

          const seedPortal = gsap.timeline();
          portalTimelineRef.current = seedPortal;
          const rings = portalRingsRef.current;
          const draw = { p: 0 };
          seedPortal.to(draw, {
            p: 1,
            duration: 0.24,
            ease: "power1.inOut",
            onUpdate: () => rings.forEach((portalRing) => {
              const total = portalRing.userData.totalVerts as number;
              portalRing.geometry.setDrawRange(0, Math.round(draw.p * total));
            }),
          }, 0);
          seedPortal.to(portal.scale, { x: 0.58, y: 0.58, z: 1, duration: 0.28, ease: "back.out(1.7)" }, 0);
          portalShellsRef.current.forEach((shell, index) => {
            const scale = 0.42 + index * 0.12;
            seedPortal.to(shell.scale, { x: scale, y: scale, z: 0.16 + index * 0.06, duration: 0.24, ease: "power3.out" }, index * 0.04);
            seedPortal.to(shell.material, { opacity: 0.15 - index * 0.02, duration: 0.16, ease: "power2.out" }, index * 0.04 + 0.04);
          });

          const closeAt = 0.52;
          [...portalShellsRef.current].reverse().forEach((shell, index) => {
            seedPortal.to(shell.scale, { x: 0.06, y: 0.06, z: 0.03, duration: 0.2, ease: "power3.in" }, closeAt + index * 0.04);
            seedPortal.to(shell.material, { opacity: 0, duration: 0.12, ease: "power2.in" }, closeAt + index * 0.04 + 0.06);
          });
          const undraw = { p: 1 };
          seedPortal.to(undraw, {
            p: 0,
            duration: 0.18,
            ease: "power2.inOut",
            onUpdate: () => rings.forEach((portalRing) => {
              const total = portalRing.userData.totalVerts as number;
              portalRing.geometry.setDrawRange(0, Math.round(undraw.p * total));
            }),
          }, closeAt + 0.1);
          seedPortal.to(portalMats.slice(0, 6), { opacity: 0, duration: 0.14, ease: "power2.in" }, closeAt + 0.12);
          seedPortal.to(portal.scale, { x: 0.02, y: 0.02, z: 1, duration: 0.24, ease: "power3.in" }, closeAt + 0.08);
          seedPortal.call(() => { portal.visible = false; }, undefined, closeAt + 0.4);
          breathTweensRef.current.push(seedPortal);
        } else {
          fadePortalOut();
        }

        fragments.forEach((mesh) => {
          const gi = mesh.userData.index as number;
          const mat = mesh.material as THREE.MeshStandardMaterial;
          const edge = edgeMaterials[gi];
          const target = scatteredTargetFor(gi);
          const size = nodeScale(gi);

          if (firstLoad) {
            // Every fragment is born at the same seed point, then bursts out
            // into the constellation just as the loop returns from the portal.
            mesh.position.set(0, 0, 0);
            mesh.rotation.set(0, 0, 0);
            gsap.set(mesh.scale, { x: size * 0.18, y: size * 0.18, z: size * 0.18 });
            gsap.set(mat, { opacity: 0 });
            gsap.set(edge, { opacity: 0 });

            const d = 0.25 + gi * 0.055;
            gsap.to(mesh.scale, {
              x: size * 0.3, y: size * 0.3, z: size * 0.3,
              duration: 0.2, ease: "sine.inOut", yoyo: true, repeat: 1, delay: 0.08 + gi * 0.015, overwrite: "auto",
            });
            gsap.to(mesh.position, {
              x: target.x, y: target.y, z: target.z,
              duration: 0.75, ease: "power3.inOut", delay: d, overwrite: "auto",
            });
            gsap.to(mesh.scale, {
              x: size, y: size, z: size, duration: 0.55, ease: "back.out(1.4)", delay: d + 0.08, overwrite: "auto",
            });
            gsap.to(mesh.rotation, {
              x: Math.PI * (1 + (gi % 3)),
              y: Math.PI * (2 - (gi % 2)),
              duration: 0.8, ease: "power1.inOut", overwrite: "auto", delay: d,
            });
            gsap.to(mat, { opacity: currentFragmentFillOpacity(), duration: 0.3, overwrite: "auto", delay: d + 0.1 });
            gsap.to(edge, { opacity: FRAGMENT_EDGE_OPACITY, duration: 0.3, overwrite: "auto", delay: d + 0.1 });
            return;
          }

          // Divers that vanished through the portal are still hidden — they
          // re-materialise along the glide to their scatter spot instead of
          // teleporting, so the scene never cuts.
          if (mesh.scale.x < 0.5 || mat.opacity < 0.06) {
            gsap.set(mesh.scale, { x: size * 0.12, y: size * 0.12, z: size * 0.12 });
            gsap.set(mat, { opacity: 0 });
            gsap.set(edge, { opacity: 0 });
          }

          applyFragmentTheme(mat, currentThemeColor());
          edge.color.setHex(currentThemeColor());
          gsap.to(mat, { opacity: currentFragmentFillOpacity(), duration: 0.25, delay: gi * 0.025, overwrite: "auto" });
          gsap.to(edge, { opacity: FRAGMENT_EDGE_OPACITY, duration: 0.25, delay: gi * 0.025, overwrite: "auto" });
          gsap.to(mesh.position, {
            x: target.x, y: target.y, z: target.z,
            duration: 0.48, ease: "back.out(1.3)", delay: gi * 0.025, overwrite: "auto",
          });
          gsap.to(mesh.rotation, {
            x: mesh.rotation.x + Math.PI * (1 + ((gi + stateIndex) % 3)),
            y: mesh.rotation.y + Math.PI * (2 - (gi % 2)),
            duration: 0.5, ease: "power2.inOut", overwrite: "auto",
          });
          gsap.to(mesh.scale, {
            x: size, y: size, z: size, duration: 0.3, ease: "back.out(1.7)", delay: gi * 0.025, overwrite: "auto",
          });
          const bob = gsap.to(mesh.position, {
            y: target.y + (gi % 2 ? 0.05 : -0.05),
            duration: 1.1 + (gi % 3) * 0.25,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
            delay: 1.2 + gi * 0.05,
            overwrite: "auto",
          });
          breathTweensRef.current.push(bob);
        });

        if (connectionLines && connectionGeometry && connectionMaterial) {
          const reveal = { p: 0 };
          const revealDelay = firstLoad ? 2.1 : 1.05;
          connectionLines.visible = true;
          connectionGeometry.setDrawRange(0, 0);
          gsap.set(connectionMaterial, { opacity: 0 });
          const revealTween = gsap.to(reveal, {
            p: CONNECTION_EDGES.length,
            duration: 0.75,
            delay: revealDelay,
            ease: "power2.inOut",
            overwrite: "auto",
            onUpdate: () => {
              connectionGeometry.setDrawRange(0, Math.round(reveal.p * 2));
            },
          });
          const pulseTween = gsap.to(connectionMaterial, {
            opacity: 0.24,
            duration: 0.75,
            delay: revealDelay + 0.52,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
            overwrite: "auto",
          });
          breathTweensRef.current.push(revealTween, pulseTween);
        }
        const phaseComplete = gsap.delayedCall(firstLoad ? 1.95 : 0.95, () => onPhaseCompleteRef.current?.(1));
        breathTweensRef.current.push(phaseComplete);
      }

      // Shield exit mirrors the entry so leaving Private stays fluid.
      if (!isPrivate && shield) {
        gsap.to(shieldMats![0], { opacity: 0, duration: 0.4, ease: "power2.in", overwrite: "auto" });
        gsap.to(shieldMats![1], { opacity: 0, duration: 0.4, ease: "power2.in", overwrite: "auto" });
        const collapse = gsap.to(shield.scale, {
          x: 0.6, y: 0.6, z: 0.6, duration: 0.45, ease: "back.in(2)", overwrite: "auto",
          onComplete: () => { shield.visible = false; },
        });
        breathTweensRef.current.push(collapse);
        applyFragmentTheme(highlightMat, currentThemeColor());
        highlightEdge.color.setHex(currentThemeColor());
        gsap.to(highlightMat, { opacity: currentFragmentFillOpacity(), duration: 0.5, overwrite: "auto" });
        gsap.to(highlightEdge, { opacity: FRAGMENT_EDGE_OPACITY, duration: 0.5, overwrite: "auto" });
        gsap.to(highlight.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: "back.out(1.6)", overwrite: "auto" });
      }
    },
    { dependencies: [stateIndex], scope: mountRef }
  );

  useEffect(() => {
    return () => {
      fragmentsRef.current = [];
      introDoneRef.current = false;
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className={cn("relative shrink-0", className)}
    />
  );
}
