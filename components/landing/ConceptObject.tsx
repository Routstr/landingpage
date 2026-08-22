"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { gsap, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

interface ConceptObjectProps {
  /** 0 = Permissionless, 1 = Decentralized, 2 = Private */
  stateIndex: number;
  className?: string;
}

const FRAGMENT_COUNT = 9;
const FRAGMENT_RADIUS = 0.16;
const RING_RADIUS = 0.62;

const BRAND_ORANGE = 0xf7931a;
const BRAND_ORANGE_EMISSIVE = {
  r: ((BRAND_ORANGE >> 16) & 0xff) / 255,
  g: ((BRAND_ORANGE >> 8) & 0xff) / 255,
  b: (BRAND_ORANGE & 0xff) / 255,
};
const FRAGMENT_COLOR = 0xd8d8d8;

// Roughly evenly spread unit directions (Fibonacci sphere) — the same
// directions are reused for every state, only their radius/spread changes,
// so it always reads as "the same object" rearranging rather than a
// different shape appearing per state.
function fibonacciDirections(count: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    points.push(new THREE.Vector3(Math.cos(theta) * radiusAtY, y, Math.sin(theta) * radiusAtY));
  }
  return points;
}

const DIRECTIONS = fibonacciDirections(FRAGMENT_COUNT);
const LOOSE_RADIUS = 0.42;
const SEALED_RADIUS = 0.3;
const SCATTERED_RADIUS = 1.05;

function targetsFor(stateIndex: number): THREE.Vector3[] {
  const radius =
    stateIndex === 1 ? SCATTERED_RADIUS : stateIndex === 2 ? SEALED_RADIUS : LOOSE_RADIUS;
  return DIRECTIONS.map((d) => d.clone().multiplyScalar(radius));
}

export function ConceptObject({ stateIndex, className }: ConceptObjectProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const fragmentsRef = useRef<THREE.Mesh[]>([]);
  const linesRef = useRef<THREE.LineSegments | null>(null);
  const ringRef = useRef<THREE.Mesh | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);

  useGSAP(
    () => {
      const mount = mountRef.current;
      if (!mount) return;

      const width = mount.clientWidth;
      const height = mount.clientHeight;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 10);
      camera.position.set(0, 0, 3.4);

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      mount.appendChild(renderer.domElement);

      const group = new THREE.Group();
      scene.add(group);
      groupRef.current = group;

      scene.add(new THREE.AmbientLight(0xffffff, 0.55));
      const key = new THREE.DirectionalLight(0xffffff, 1.1);
      key.position.set(2, 2, 3);
      scene.add(key);

      const geometry = new THREE.IcosahedronGeometry(FRAGMENT_RADIUS, 0);
      const fragments = DIRECTIONS.map((dir, i) => {
        const material = new THREE.MeshStandardMaterial({
          color: FRAGMENT_COLOR,
          flatShading: true,
          roughness: 0.35,
          metalness: 0.2,
          emissive: 0x000000,
        });
        const mesh = new THREE.Mesh(geometry, material);
        const start = dir.clone().multiplyScalar(LOOSE_RADIUS);
        mesh.position.copy(start);
        mesh.userData.index = i;
        group.add(mesh);
        return mesh;
      });
      fragmentsRef.current = fragments;

      const lineGeometry = new THREE.BufferGeometry();
      const linePositions = new Float32Array(FRAGMENT_COUNT * FRAGMENT_COUNT * 3 * 2);
      lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
      const lineMaterial = new THREE.LineBasicMaterial({
        color: FRAGMENT_COLOR,
        transparent: true,
        opacity: 0,
      });
      const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
      group.add(lines);
      linesRef.current = lines;

      const ringGeometry = new THREE.TorusGeometry(RING_RADIUS, 0.018, 8, 48);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: FRAGMENT_COLOR,
        transparent: true,
        opacity: 0,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2.3;
      group.add(ring);
      ringRef.current = ring;

      let raf = 0;
      const renderLoop = () => {
        // Keep connecting lines glued to their fragments every frame so
        // GSAP only ever has to animate the fragment meshes themselves.
        const positions = lineGeometry.attributes.position.array as Float32Array;
        let segCount = 0;
        for (let i = 0; i < FRAGMENT_COUNT; i++) {
          for (let j = i + 1; j < FRAGMENT_COUNT; j++) {
            const a = fragments[i].position;
            const b = fragments[j].position;
            if (a.distanceTo(b) > 0.75) continue;
            const o = segCount * 6;
            positions[o] = a.x;
            positions[o + 1] = a.y;
            positions[o + 2] = a.z;
            positions[o + 3] = b.x;
            positions[o + 4] = b.y;
            positions[o + 5] = b.z;
            segCount++;
          }
        }
        lineGeometry.setDrawRange(0, segCount * 2);
        lineGeometry.attributes.position.needsUpdate = true;

        renderer.render(scene, camera);
        raf = requestAnimationFrame(renderLoop);
      };
      raf = requestAnimationFrame(renderLoop);

      const idleRotation = gsap.to(group.rotation, {
        y: Math.PI * 2,
        duration: 40,
        repeat: -1,
        ease: "none",
      });

      const resize = () => {
        const w = mount.clientWidth;
        const h = mount.clientHeight;
        if (!w || !h) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      const observer = new ResizeObserver(resize);
      observer.observe(mount);

      return () => {
        cancelAnimationFrame(raf);
        idleRotation.kill();
        observer.disconnect();
        geometry.dispose();
        lineGeometry.dispose();
        ringGeometry.dispose();
        fragments.forEach((f) => (f.material as THREE.Material).dispose());
        lineMaterial.dispose();
        ringMaterial.dispose();
        renderer.dispose();
        mount.removeChild(renderer.domElement);
      };
    },
    { scope: mountRef }
  );

  useGSAP(
    () => {
      const fragments = fragmentsRef.current;
      const lines = linesRef.current;
      const ring = ringRef.current;
      if (!fragments.length || !lines || !ring) return;

      const targets = targetsFor(stateIndex);
      const tl = gsap.timeline();

      fragments.forEach((mesh, i) => {
        tl.to(
          mesh.position,
          { x: targets[i].x, y: targets[i].y, z: targets[i].z, duration: 0.9, ease: "power2.inOut" },
          0
        );
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const isHighlightFacet = i === 0;
        tl.to(
          mat.emissive,
          {
            r: stateIndex === 2 && isHighlightFacet ? BRAND_ORANGE_EMISSIVE.r : 0,
            g: stateIndex === 2 && isHighlightFacet ? BRAND_ORANGE_EMISSIVE.g : 0,
            b: stateIndex === 2 && isHighlightFacet ? BRAND_ORANGE_EMISSIVE.b : 0,
            duration: 0.6,
            ease: "power2.out",
          },
          0.2
        );
      });

      tl.to(
        (lines.material as THREE.LineBasicMaterial),
        { opacity: stateIndex === 1 ? 0.35 : 0, duration: 0.5, ease: "power2.out" },
        0.1
      );

      tl.to(
        ring.scale,
        { x: stateIndex === 0 ? 1 : 1.4, y: stateIndex === 0 ? 1 : 1.4, z: 1, duration: 0.9, ease: "power2.inOut" },
        0
      );
      tl.to(
        (ring.material as THREE.MeshBasicMaterial),
        { opacity: stateIndex === 0 ? 0.5 : 0, duration: 0.5, ease: "power2.out" },
        0
      );

      return () => {
        tl.kill();
      };
    },
    { dependencies: [stateIndex], scope: mountRef }
  );

  useEffect(() => {
    return () => {
      fragmentsRef.current = [];
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
