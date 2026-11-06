export function palette(t: number, dark: boolean, sat = 1): [number, number, number] {
  const k = Math.PI * 2;
  const r = 0.64 + 0.26 * sat * Math.cos(k * (t + 0.0));
  const g = 0.6 + 0.22 * sat * Math.cos(k * (t + 0.2));
  const b = 0.7 + 0.26 * sat * Math.cos(k * (t + 0.4));
  const m = dark ? 1 : 0.5;
  const clamp = (v: number) => Math.max(0.05, Math.min(1, v));
  return [clamp(r) * m, clamp(g) * m, clamp(b) * m];
}

export function hourHue(t: number): number {
  const d = new Date();
  const hour = d.getHours() + d.getMinutes() / 60;
  return (hour / 24 + 0.03 * Math.sin(t * 0.05)) % 1;
}

export const HUE_GAP = 0.28;

export function readForeground(el: Element): [number, number, number] {
  const m = getComputedStyle(el).color.match(/\d+(\.\d+)?/g);
  return m && m.length >= 3 ? [Number(m[0]), Number(m[1]), Number(m[2])] : [128, 128, 128];
}
