import {
  ROUTSTR_MARK_PATH,
  ROUTSTR_MARK_VIEWBOX_MIN,
  ROUTSTR_MARK_VIEWBOX_SIZE,
} from "@/lib/brand";

export const WORD = "ROUTSTR";

// The marks the sign cycles through, in order: Routstr, Bitcoin, Lightning, Cashu, Nostr.
export type Glyph =
  | { kind: "path"; box: number; min?: number; fill: string[]; cut?: string[]; cutScale?: number }
  | { kind: "image"; src: string };

export const GLYPHS: Glyph[] = [
  { kind: "path", box: ROUTSTR_MARK_VIEWBOX_SIZE, min: ROUTSTR_MARK_VIEWBOX_MIN, fill: [ROUTSTR_MARK_PATH] },
  {
    kind: "path",
    box: 64,
    fill: [
      "M63.04 39.741c-4.274 17.143-21.638 27.574-38.783 23.301C7.117 58.77-3.324 41.407.951 24.262 5.224 7.117 22.588-3.323 39.737.951c17.144 4.274 27.576 21.64 23.302 38.79z",
    ],
    cut: [
      "M46.11 27.44c.636-4.258-2.606-6.547-7.039-8.074l1.438-5.768-3.512-.875-1.4 5.616c-.923-.23-1.871-.447-2.813-.662l1.41-5.653-3.51-.875-1.439 5.766c-.724-.165-1.432-.328-2.118-.499l.004-.018-4.845-1.21-.934 3.75s2.605.597 2.55.634c1.422.355 1.68 1.296 1.636 2.042l-1.638 6.571c.098.025.225.061.365.117l-.37-.092-2.297 9.209c-.174.432-.615 1.08-1.609.834.035.051-2.552-.637-2.552-.637l-1.743 4.02 4.846 1.208c.902.226 1.785.462 2.655.685l-1.454 5.835 3.507.875 1.44-5.772c.958.26 1.888.5 2.798.727l-1.434 5.745 3.511.875 1.454-5.823c5.987 1.133 10.49.677 12.383-4.739 1.528-4.36-.076-6.875-3.226-8.515 2.294-.529 4.022-2.038 4.483-5.155zm-8.021 11.29c-1.085 4.36-8.427 2.003-10.807 1.412l1.928-7.729c2.38.594 10.013 1.77 8.88 6.317zm1.085-11.356c-.99 3.966-7.1 1.951-9.083 1.457l1.748-7.01c1.982.494 8.366 1.416 7.335 5.553z",
    ],
  },
  {
    kind: "path",
    box: 24,
    fill: ["M12 0a12 12 0 1 0 0 24a12 12 0 1 0 0-24z"],
    cut: [
      "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",
    ],
    cutScale: 0.62,
  },
  { kind: "image", src: "/lockup/cashu.png" },
  {
    kind: "path",
    box: 256,
    fill: [
      "M210.8 199.4c0 3.1-2.5 5.7-5.7 5.7h-68c-3.1 0-5.7-2.5-5.7-5.7v-15.5c.3-19 2.3-37.2 6.5-45.5 2.5-5 6.7-7.7 11.5-9.1 9.1-2.7 24.9-.9 31.7-1.2 0 0 20.4.8 20.4-10.7s-9.1-8.6-9.1-8.6c-10 .3-17.7-.4-22.6-2.4-8.3-3.3-8.6-9.2-8.6-11.2-.4-23.1-34.5-25.9-64.5-20.1-32.8 6.2.4 53.3.4 116.1v8.4c0 3.1-2.6 5.6-5.7 5.6H57.7c-3.1 0-5.7-2.5-5.7-5.7v-144c0-3.1 2.5-5.7 5.7-5.7h31.7c3.1 0 5.7 2.5 5.7 5.7 0 4.7 5.2 7.2 9 4.5 11.4-8.2 26-12.5 42.4-12.5 36.6 0 64.4 21.4 64.4 68.7v83.2ZM150 99.3c0-6.7-5.4-12.1-12.1-12.1s-12.1 5.4-12.1 12.1 5.4 12.1 12.1 12.1S150 106 150 99.3Z",
    ],
  },
];

// Mask ids: 0 the word, 1..n the marks centred, then each mark in each of the
// three reel windows, then the message.
export const SHAPES = 1 + GLYPHS.length;
export const MSG_ID = SHAPES + 3 * GLYPHS.length;
export const reelBit = (id: number, reel: number) => (id === 0 ? 1 : 1 << (SHAPES + 3 * (id - 1) + reel));

export type Images = Map<string, HTMLImageElement>;

export type MaskSet = {
  masks: Uint8ClampedArray[];
  bright: (Uint8ClampedArray | null)[];
  wordSize: number;
};

export function makeScratch(w: number, h: number): CanvasRenderingContext2D | null {
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  return off.getContext("2d", { willReadFrequently: true });
}

export function drawText(
  o: CanvasRenderingContext2D,
  text: string,
  w: number,
  h: number,
  font: string,
  size: number
): { data: Uint8ClampedArray; size: number } {
  o.clearRect(0, 0, w, h);
  o.font = `${size}px ${font}`;
  const tw = o.measureText(text).width;
  if (tw > w * 0.94) size = Math.floor((size * w * 0.94) / tw);
  o.font = `${size}px ${font}`;
  o.textAlign = "center";
  o.textBaseline = "middle";
  o.fillStyle = "#fff";
  o.strokeStyle = "#fff";
  o.lineWidth = Math.max(2, size * 0.06);
  o.lineJoin = "round";
  o.fillText(text, w / 2, h * 0.53);
  o.strokeText(text, w / 2, h * 0.53);
  return { data: o.getImageData(0, 0, w, h).data, size };
}

export function drawGlyph(
  o: CanvasRenderingContext2D,
  g: Glyph,
  cx: number,
  glyphSize: number,
  w: number,
  h: number,
  images: Images
): Uint8ClampedArray | null {
  o.clearRect(0, 0, w, h);
  if (g.kind === "path") {
    const scale = glyphSize / g.box;
    o.save();
    o.translate(cx - glyphSize / 2, h * 0.53 - glyphSize / 2);
    o.scale(scale, scale);
    if (g.min) o.translate(-g.min, -g.min);
    // Small: cut-outs get too thin, so show the B and the bolt instead of the coin.
    const cuts = (g.cut ?? []).map((d) => {
      const p = new Path2D();
      const k = g.cutScale ?? 1;
      const c = g.box / 2 + (g.min ?? 0);
      p.addPath(new Path2D(d), new DOMMatrix().translate(c, c).scale(k).translate(-c, -c));
      return p;
    });
    if (cuts.length && glyphSize < 96) {
      for (const p of cuts) o.fill(p);
    } else {
      for (const p of g.fill) o.fill(new Path2D(p));
      if (cuts.length) {
        o.globalCompositeOperation = "destination-out";
        for (const p of cuts) o.fill(p);
        o.globalCompositeOperation = "source-over";
      }
    }
    o.restore();
    return o.getImageData(0, 0, w, h).data;
  }
  const img = images.get(g.src);
  if (!img || !img.naturalWidth) return null;
  const s = Math.min(glyphSize / img.naturalWidth, glyphSize / img.naturalHeight);
  const iw = img.naturalWidth * s;
  const ih = img.naturalHeight * s;
  o.drawImage(img, cx - iw / 2, h * 0.53 - ih / 2, iw, ih);
  return o.getImageData(0, 0, w, h).data;
}

export function buildMasks(w: number, h: number, font: string, images: Images): MaskSet | null {
  const o = makeScratch(w, h);
  if (!o) return null;
  const word = drawText(o, WORD, w, h, font, Math.round(h * 0.62));
  const masks = [word.data];
  const bright: (Uint8ClampedArray | null)[] = [null];
  const empty = () => new Uint8ClampedArray(w * h * 4);
  const glyphSize = Math.min(h * 0.9, word.size * 1.15);
  for (const g of GLYPHS) {
    const m = drawGlyph(o, g, w / 2, glyphSize, w, h, images) ?? empty();
    masks.push(m);
    bright.push(g.kind === "image" ? m : null);
  }
  const reelSize = Math.min(h * 0.82, (w / 3) * 0.72);
  for (const g of GLYPHS) {
    for (let r = 0; r < 3; r++) {
      const m = drawGlyph(o, g, (w * (2 * r + 1)) / 6, reelSize, w, h, images) ?? empty();
      masks.push(m);
      bright.push(g.kind === "image" ? m : null);
    }
  }
  return { masks, bright, wordSize: word.size };
}

export function messageMask(w: number, h: number, font: string, size: number, text: string): Uint8ClampedArray | null {
  const o = makeScratch(w, h);
  return o ? drawText(o, text, w, h, font, size).data : null;
}
