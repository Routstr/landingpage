export type Rgb = [number, number, number];

// Brand colour per mark id, shown only on a jackpot; the Routstr mark keeps the duotone.
export const BRAND: Record<number, Rgb> = {
  2: [247, 147, 26],
  3: [123, 26, 247],
  4: [214, 181, 138],
  5: [142, 48, 235],
};

// Type one of these anywhere on the page and the sign spells it back.
export const WORDS: Record<string, Rgb | null> = {
  gm: [244, 188, 96],
  gn: [96, 120, 200],
  sats: [247, 147, 26],
  hodl: [247, 147, 26],
  "21": [247, 147, 26],
  zap: [123, 26, 247],
  nostr: [142, 48, 235],
  cashu: [214, 181, 138],
  routstr: null,
};

// Greeting on first view, keyed "month-day" with a 1-based month.
export const DATES: Record<string, string> = {
  "1-3": "GENESIS",
  "10-31": "SATOSHI",
  "5-22": "PIZZA",
};

export const BITCOIN_ORANGE: Rgb = [247, 147, 26];
