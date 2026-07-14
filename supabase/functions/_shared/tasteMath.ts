/** Shared taste scoring math for Edge Functions (Deno). */

export type MixWeights = {
  alpha: number;
  beta: number;
  gamma: number;
};

export type TasteProfile = {
  genreWeights: Record<string, number>;
  decadeWeights: Record<string, number>;
  keywordWeights: Record<string, number>;
  castWeights: Record<string, number>;
  signalCount: number;
  updatedAt: string;
};

export type InteractionRow = {
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  action: 'like' | 'nope' | 'seen';
  rating: number | null;
  updated_at: string;
};

const SIGNAL_SATURATION = 40;

export function mixWeightsFromSignals(signalCount: number): MixWeights {
  const t = Math.min(1, Math.max(0, signalCount / SIGNAL_SATURATION));
  // Cold start: platforms (γ) dominate, heuristic (α) moderate, embeddings (β) near zero.
  // As signals grow: β rises, γ falls, α stays useful for interpretability.
  let alpha = 0.42 - 0.08 * t;
  let beta = 0.02 + 0.53 * t;
  let gamma = 0.56 - 0.45 * t;
  const sum = alpha + beta + gamma;
  return { alpha: alpha / sum, beta: beta / sum, gamma: gamma / sum };
}

export function recencyFactor(updatedAt: string, now = Date.now()): number {
  const ageMs = Math.max(0, now - Date.parse(updatedAt));
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.max(0.35, Math.exp(-ageDays / 120));
}

export function interactionSignalWeight(row: InteractionRow, now = Date.now()): number {
  const recency = recencyFactor(row.updated_at, now);
  if (row.action === 'like') {
    return 0.9 * recency;
  }
  if (row.action === 'nope') {
    return -0.55 * recency;
  }
  if (row.action === 'seen') {
    if (row.rating != null && row.rating >= 8) {
      return (row.rating / 10) * recency;
    }
    if (row.rating != null && row.rating > 0 && row.rating <= 4) {
      return -0.7 * (1 - row.rating / 10) * recency;
    }
    // Unrated seen (calibration "liked" or deferred rating) — mild positive.
    if (row.rating == null) {
      return 0.35 * recency;
    }
  }
  return 0;
}

export function isSeedCandidate(row: InteractionRow): boolean {
  if (row.action === 'like') {
    return true;
  }
  if (row.action === 'seen' && row.rating != null && row.rating >= 8) {
    return true;
  }
  if (row.action === 'seen' && row.rating == null) {
    return true;
  }
  return false;
}

export function seedStrength(row: InteractionRow, now = Date.now()): number {
  if (!isSeedCandidate(row)) {
    return 0;
  }
  return Math.max(0, interactionSignalWeight(row, now));
}

export function decadeBucket(year: number | null): string | null {
  if (year == null || !Number.isFinite(year)) {
    return null;
  }
  if (year < 1970) {
    return 'pre1970';
  }
  const bucket = Math.floor(year / 10) * 10;
  return String(bucket);
}

export function yearFromDate(raw: string | null | undefined): number | null {
  if (!raw || raw.length < 4) {
    return null;
  }
  const year = Number.parseInt(raw.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

export function addWeight(map: Record<string, number>, key: string, delta: number): void {
  map[key] = (map[key] ?? 0) + delta;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) {
    return 0;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function weightedAverageVectors(
  items: Array<{ vector: number[]; weight: number }>,
): number[] | null {
  const usable = items.filter((item) => item.vector.length > 0 && item.weight > 0);
  if (usable.length === 0) {
    return null;
  }
  const dims = usable[0].vector.length;
  const out = new Array<number>(dims).fill(0);
  let total = 0;
  for (const item of usable) {
    if (item.vector.length !== dims) {
      continue;
    }
    total += item.weight;
    for (let i = 0; i < dims; i += 1) {
      out[i] += item.vector[i] * item.weight;
    }
  }
  if (total <= 0) {
    return null;
  }
  for (let i = 0; i < dims; i += 1) {
    out[i] /= total;
  }
  return l2Normalize(out);
}

export function l2Normalize(vector: number[]): number[] {
  let norm = 0;
  for (const value of vector) {
    norm += value * value;
  }
  norm = Math.sqrt(norm);
  if (norm === 0) {
    return vector.map(() => 0);
  }
  return vector.map((value) => value / norm);
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function heuristicScore(
  genreIds: number[],
  year: number | null,
  taste: TasteProfile,
  popularity: number,
): number {
  let genreScore = 0;
  let genreMass = 0;
  for (const genreId of genreIds) {
    const w = taste.genreWeights[String(genreId)] ?? 0;
    genreScore += w;
    genreMass += Math.abs(w);
  }
  const genreNorm = genreMass > 0 ? clamp01((genreScore / genreMass + 1) / 2) : 0.5;

  const decade = decadeBucket(year);
  const decadeW = decade ? (taste.decadeWeights[decade] ?? 0) : 0;
  const decadeNorm = clamp01((Math.tanh(decadeW) + 1) / 2);

  const popNorm = clamp01(Math.log10(Math.max(popularity, 1)) / 3);

  return 0.55 * genreNorm + 0.25 * decadeNorm + 0.2 * popNorm;
}

export function combineScore(
  weights: MixWeights,
  heuristic: number,
  embedding: number,
  onPlatform: boolean,
): number {
  const platform = onPlatform ? 1 : 0;
  const jitter = Math.random() * 0.04;
  return weights.alpha * heuristic + weights.beta * embedding + weights.gamma * platform + jitter;
}
