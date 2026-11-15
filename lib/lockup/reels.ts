// Three reel windows flip through the marks and stop left to right; the last
// one lands one short of its result, holds, then ticks over.
export type Outcome = "plain" | "miss" | "jackpot";
export type Reel = { steps: number[]; shapes: number[]; end: number; final: number };

export const SPIN_EVERY = 2;
export const JACKPOT_HOLD = 2.6;
export const MISS_HOLD = 1.6;
export const STREAK = 3;

// First spin is a near miss, second a jackpot, then luck.
export function pickOutcome(spins: number): Outcome {
  if (spins === 0) return "miss";
  if (spins === 1) return "jackpot";
  const roll = Math.random();
  return roll < 0.4 ? "jackpot" : roll < 0.75 ? "miss" : "plain";
}

export function buildReels(marks: number, outcome: Outcome): Reel[] {
  const pick = () => 1 + Math.floor(Math.random() * marks);
  const c = pick();
  let other = pick();
  while (other === c) other = pick();
  let third = pick();
  while (third === c || third === other) third = pick();
  const finals = outcome === "jackpot" ? [c, c, c] : outcome === "miss" ? [c, c, other] : [c, other, third];

  return finals.map((final, r) => {
    const stopAt = 1.3 + 0.35 * r;
    const n = 8 + 2 * r;
    const raw = Array.from({ length: n }, (_, k) => 0.11 + 0.2 * (k / (n - 1)) ** 2);
    const sum = raw.reduce((a, b) => a + b, 0);
    const steps = raw.map((v) => (v * stopAt) / sum);
    const start = Math.floor(Math.random() * marks);
    const shapes = steps.map((_, k) => 1 + ((start + k) % marks));
    if (r < 2) {
      shapes[n - 1] = final;
    } else {
      let tease = 1 + (final % marks);
      if (tease === final) tease = pick();
      shapes[n - 1] = tease;
      steps.push(0.4, 0.25);
      shapes.push(tease, final);
    }
    return { steps, shapes, end: steps.reduce((a, b) => a + b, 0), final };
  });
}
