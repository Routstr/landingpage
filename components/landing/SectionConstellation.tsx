"use client";

import { useEffect, useRef } from "react";

// Lightweight 2D echo of the hero's decentralized-nodes animation. On first
// scroll-in, a cluster of small nodes bursts outward from the centre — the
// "decentralising" moment — then settles into a slow linked drift. Canvas 2D
// only, so it never competes with the page's WebGL contexts; it pauses when
// off-screen and skips motion entirely under prefers-reduced-motion.
//
// Tunables (defaults match the routstrd sections):
//   nodeRadius    — size of each node (px; glyph base radius when shape="poly")
//   intensity     — multiplier on node & link alphas (<1 = more transparent)
//   densityDivisor— canvas px per node (higher = fewer nodes, lighter)
//   min/maxNodes  — clamp for the node count derived from section area
//   shape         — "dot" renders plain circles; "poly" renders small tumbling
//                   polygon glyphs (faint fill + crisp outline) echoing the
//                   hero's flat-shaded icosahedron fragments
//   spread        — settle burst nodes onto a jittered grid covering the whole
//                   section (hero-like constellation) instead of free drift
//   linkDistance  — max px between two nodes to draw a link (0 = no links)
//   linkIntensity — extra multiplier on link alpha (sparse, faint links)
//   fillStrength  — glyph body opacity relative to its outline (0.18 faint,
//                   ~0.85 solid like the hero fragments)

type SectionConstellationProps = {
  active?: boolean;
  nodeRadius?: number;
  intensity?: number;
  densityDivisor?: number;
  minNodes?: number;
  maxNodes?: number;
  shape?: "dot" | "poly";
  spread?: boolean;
  linkDistance?: number;
  linkIntensity?: number;
  fillStrength?: number;
};

type Node = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  bursting: boolean;
  rot: number;
  vr: number;
  size: number;
  sides: number;
  tx: number;
  ty: number;
  bob: number;
  bobSpeed: number;
};

export function SectionConstellation({
  active = true,
  nodeRadius = 1.9,
  intensity = 1,
  densityDivisor = 34000,
  minNodes = 28,
  maxNodes = 52,
  shape = "dot",
  spread = false,
  linkDistance = 140,
  linkIntensity = 1,
  fillStrength = 0.18,
}: SectionConstellationProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const canvas = wrapper.querySelector("canvas");
    if (!(canvas instanceof HTMLCanvasElement)) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const MARGIN = 24;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Narrow viewports get smaller glyphs so the constellation doesn't squish.
    const sizeScale = Math.max(0.62, Math.min(1, wrapper.getBoundingClientRect().width / 1100));

    let width = 0;
    let height = 0;
    let raf = 0;
    let visible = true;
    let burstTriggered = false;
    let nodes: Node[] = [];

    const edgeFade = (x: number, y: number) => {
      const fx = Math.min(1, Math.min(x, width - x) / MARGIN);
      const fy = Math.min(1, Math.min(y, height - y) / MARGIN);
      return Math.max(0, Math.min(fx, fy));
    };

    // Jittered grid across the whole canvas — every cell gets one node, so
    // the constellation fills the section evenly at any aspect ratio.
    const gridTargets = (count: number) => {
      const aspect = width / Math.max(1, height);
      const cols = Math.max(1, Math.round(Math.sqrt(count * aspect)));
      const rows = Math.ceil(count / cols);
      const cellW = (width - MARGIN * 2) / cols;
      const cellH = (height - MARGIN * 2) / rows;
      return Array.from({ length: count }, (_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        return {
          tx: MARGIN + cellW * (col + 0.5) + (Math.random() - 0.5) * cellW * 0.7,
          ty: MARGIN + cellH * (row + 0.5) + (Math.random() - 0.5) * cellH * 0.7,
        };
      });
    };

    const scatter = (fromCentre: boolean): Node[] => {
      const count = Math.max(minNodes, Math.min(maxNodes, Math.round((width * height) / densityDivisor)));
      const cx = width / 2;
      const cy = height / 2;
      const targets = gridTargets(count);
      return Array.from({ length: count }, (_, i) => {
        const angle = fromCentre
          ? (i / count) * Math.PI * 2 + Math.random() * 0.6
          : Math.random() * Math.PI * 2;
        const speed = fromCentre ? 0.9 + Math.random() * 1.5 : 0.12 + Math.random() * 0.1;
        const dist = fromCentre ? 8 + Math.random() * 36 : 0;
        // A few larger primaries, most smaller — like the hero's fragments.
        const big = Math.random() < 0.22;
        return {
          x: fromCentre ? cx + Math.cos(angle) * dist : targets[i].tx,
          y: fromCentre ? cy + Math.sin(angle) * dist : targets[i].ty,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          bursting: fromCentre,
          rot: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.03,
          size: nodeRadius * sizeScale * (big ? 1.25 + Math.random() * 0.35 : 0.6 + Math.random() * 0.35),
          sides: [5, 6, 6, 7][Math.floor(Math.random() * 4)],
          tx: targets[i].tx,
          ty: targets[i].ty,
          bob: Math.random() * Math.PI * 2,
          bobSpeed: 0.004 + Math.random() * 0.004,
        };
      });
    };

    const draw = () => {
      const dark = document.documentElement.classList.contains("dark");
      ctx.clearRect(0, 0, width, height);
      if (linkDistance > 0) {
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i];
            const b = nodes[j];
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            if (dist > linkDistance) continue;
            const fade = edgeFade((a.x + b.x) / 2, (a.y + b.y) / 2);
            const alpha = (1 - dist / linkDistance) * fade * intensity * linkIntensity * (dark ? 0.22 : 0.16);
            if (alpha <= 0.004) continue;
            ctx.strokeStyle = dark ? `rgba(229,229,229,${alpha})` : `rgba(10,10,10,${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      const rgb = dark ? "229,229,229" : "10,10,10";
      for (const node of nodes) {
        const fade = edgeFade(node.x, node.y);
        if (fade <= 0.02) continue;
        const alpha = fade * intensity * (dark ? 0.55 : 0.45);
        if (alpha <= 0.004) continue;
        if (shape === "poly") {
          // Flat-shaded glyph: body + crisp outline, like the hero's
          // icosahedron fragments (solid fill with edge lines).
          ctx.beginPath();
          for (let s = 0; s < node.sides; s++) {
            const a = node.rot + (s / node.sides) * Math.PI * 2;
            const px = node.x + Math.cos(a) * node.size;
            const py = node.y + Math.sin(a) * node.size;
            if (s === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fillStyle = `rgba(${rgb},${alpha * fillStrength})`;
          ctx.fill();
          ctx.strokeStyle = `rgba(${rgb},${alpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(${rgb},${alpha})`;
          ctx.beginPath();
          ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const resize = () => {
      const rect = wrapper.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      if (!width || !height) return;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!burstTriggered) nodes = scatter(false);
      else {
        // Keep the settled constellation spread across the new box.
        const targets = gridTargets(nodes.length);
        nodes.forEach((node, i) => {
          const t = targets[i] ?? { tx: node.tx, ty: node.ty };
          node.tx = t.tx;
          node.ty = t.ty;
          node.x = Math.min(Math.max(node.x, MARGIN), width - MARGIN);
          node.y = Math.min(Math.max(node.y, MARGIN), height - MARGIN);
        });
      }
      draw();
    };

    const step = () => {
      raf = 0;
      if (!visible) return;
      for (const node of nodes) {
        node.rot += node.vr;
        if (spread && !node.bursting) {
          // Gentle float around the grid target — the hero's breathing drift.
          node.bob += node.bobSpeed;
          const pull = 0.012;
          node.vx += (node.tx - node.x) * pull;
          node.vy += (node.ty - node.y) * pull;
          node.vx *= 0.94;
          node.vy *= 0.94;
          node.x += node.vx + Math.cos(node.bob) * 0.06;
          node.y += node.vy + Math.sin(node.bob * 1.3) * 0.05;
        } else {
          node.x += node.vx;
          node.y += node.vy;
          if (node.bursting) {
            node.vx *= 0.986;
            node.vy *= 0.986;
            if (spread && Math.hypot(node.tx - node.x, node.ty - node.y) < 4) {
              node.bursting = false;
              node.vx = 0;
              node.vy = 0;
            } else if (Math.hypot(node.vx, node.vy) < 0.22) {
              node.bursting = false;
              const drift = Math.random() * Math.PI * 2;
              node.vx = Math.cos(drift) * 0.16;
              node.vy = Math.sin(drift) * 0.16;
            }
          }
        }
        if (node.x < MARGIN || node.x > width - MARGIN) {
          node.x = Math.min(Math.max(node.x, MARGIN), width - MARGIN);
          node.vx = Math.abs(node.vx) * (node.x <= MARGIN ? 1 : -1);
        }
        if (node.y < MARGIN || node.y > height - MARGIN) {
          node.y = Math.min(Math.max(node.y, MARGIN), height - MARGIN);
          node.vy = Math.abs(node.vy) * (node.y <= MARGIN ? 1 : -1);
        }
      }
      draw();
      raf = requestAnimationFrame(step);
    };

    resize();
    const observer = new ResizeObserver(() => resize());
    observer.observe(wrapper);

    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) return;
      if (!burstTriggered) {
        burstTriggered = true;
        if (reducedMotion) {
          nodes = scatter(false);
          draw();
          return;
        }
        nodes = scatter(true);
      }
      if (!reducedMotion && !raf) raf = requestAnimationFrame(step);
    });
    visibility.observe(wrapper);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
      visibility.disconnect();
    };
  }, [densityDivisor, intensity, linkDistance, linkIntensity, fillStrength, maxNodes, minNodes, nodeRadius, shape, spread]);

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      className={`absolute inset-0 transition-opacity duration-700 ${active ? "opacity-100" : "opacity-0"}`}
    >
      <canvas />
    </div>
  );
}
