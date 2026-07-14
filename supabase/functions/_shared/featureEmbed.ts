/** Deterministic feature embeddings from TMDB metadata (no external AI key required). */

import { l2Normalize, yearFromDate } from './tasteMath.ts';

export const EMBED_MODEL = 'feature-v1';
export const EMBED_DIMS = 96;

const GENRE_IDS = [
  28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878, 10770, 53, 10752, 37,
  10759, 10762, 10763, 10764, 10765, 10766, 10767, 10768,
] as const;

const GENRE_INDEX = new Map<number, number>(GENRE_IDS.map((id, index) => [id, index]));
const GENRE_DIMS = GENRE_IDS.length; // 28
const DECADE_DIMS = 8;
const CAST_DIMS = 32;
const KEYWORD_DIMS = 28;
// 28 + 8 + 32 + 28 = 96

export type EmbedInput = {
  genreIds: number[];
  releaseDate?: string | null;
  firstAirDate?: string | null;
  castIds?: number[];
  keywordIds?: number[];
  directorIds?: number[];
};

function hashToUnit(id: number, salt: number): number {
  let x = (id ^ salt) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  x = (x ^ (x >>> 16)) >>> 0;
  return (x % 10000) / 10000;
}

function sprinkleIds(vector: number[], offset: number, dims: number, ids: number[], salt: number): void {
  for (const id of ids) {
    const slot = offset + (Math.abs(id * 2654435761) % dims);
    const sign = hashToUnit(id, salt) > 0.5 ? 1 : -1;
    const mag = 0.35 + 0.65 * hashToUnit(id, salt + 17);
    vector[slot] += sign * mag;
  }
}

function decadeIndex(year: number | null): number {
  if (year == null) {
    return 0;
  }
  if (year < 1970) {
    return 0;
  }
  if (year >= 2020) {
    return 7;
  }
  return Math.min(7, Math.max(0, Math.floor((year - 1970) / 10) + 1));
}

export function buildFeatureEmbedding(input: EmbedInput): number[] {
  const vector = new Array<number>(EMBED_DIMS).fill(0);
  const year = yearFromDate(input.releaseDate ?? input.firstAirDate ?? null);

  for (const genreId of input.genreIds) {
    const index = GENRE_INDEX.get(genreId);
    if (index != null) {
      vector[index] += 1;
    }
  }

  vector[GENRE_DIMS + decadeIndex(year)] += 1;

  const castIds = (input.castIds ?? []).slice(0, 8);
  const directorIds = (input.directorIds ?? []).slice(0, 2);
  const keywordIds = (input.keywordIds ?? []).slice(0, 12);

  sprinkleIds(vector, GENRE_DIMS + DECADE_DIMS, CAST_DIMS, [...castIds, ...directorIds], 101);
  sprinkleIds(vector, GENRE_DIMS + DECADE_DIMS + CAST_DIMS, KEYWORD_DIMS, keywordIds, 303);

  return l2Normalize(vector);
}
