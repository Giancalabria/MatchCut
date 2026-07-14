export type MixWeights = {
  alpha: number;
  beta: number;
  gamma: number;
};

/** Saturates around 40 interactions — same curve as the Edge Function. */
export const SIGNAL_SATURATION = 40;

/**
 * Dynamic mix for personalized ranking:
 * - alpha (α): heuristic taste profile (genres, decades, popularity)
 * - beta (β): embedding similarity to seed titles
 * - gamma (γ): on-platform availability boost
 */
export function mixWeightsFromSignals(signalCount: number): MixWeights {
  const t = Math.min(1, Math.max(0, signalCount / SIGNAL_SATURATION));
  let alpha = 0.42 - 0.08 * t;
  let beta = 0.02 + 0.53 * t;
  let gamma = 0.56 - 0.45 * t;
  const sum = alpha + beta + gamma;
  return { alpha: alpha / sum, beta: beta / sum, gamma: gamma / sum };
}
