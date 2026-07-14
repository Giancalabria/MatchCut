// @ts-expect-error Deno npm imports are resolved by the Supabase Edge Runtime.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { buildFeatureEmbedding, EMBED_DIMS, EMBED_MODEL } from './featureEmbed.ts';
import {
  castIdsFromDetails,
  directorIdsFromDetails,
  fetchDetails,
  keywordIdsFromDetails,
  type MediaType,
} from './tmdb.ts';

export type TitleRef = {
  media_type: MediaType;
  tmdb_id: number;
};

type EmbedRow = {
  media_type: MediaType;
  tmdb_id: number;
  model: string;
  embedding: number[];
  dims: number;
  meta: Record<string, unknown>;
};

export { EMBED_DIMS, EMBED_MODEL };

export async function ensureEmbeddings(
  admin: ReturnType<typeof createClient>,
  refs: TitleRef[],
  language: string,
): Promise<Map<string, number[]>> {
  const unique = new Map<string, TitleRef>();
  for (const ref of refs) {
    unique.set(`${ref.media_type}:${ref.tmdb_id}`, ref);
  }
  const list = [...unique.values()].slice(0, 48);
  const result = new Map<string, number[]>();
  if (list.length === 0) {
    return result;
  }

  const { data: existing } = await admin
    .from('title_embeddings')
    .select('media_type, tmdb_id, embedding')
    .eq('model', EMBED_MODEL)
    .in(
      'tmdb_id',
      list.map((ref) => ref.tmdb_id),
    );

  for (const row of existing ?? []) {
    const key = `${row.media_type}:${row.tmdb_id}`;
    if (Array.isArray(row.embedding) && unique.has(key)) {
      result.set(key, row.embedding as number[]);
    }
  }

  const missing = list.filter((ref) => !result.has(`${ref.media_type}:${ref.tmdb_id}`));
  const upserts: EmbedRow[] = [];

  for (const ref of missing) {
    try {
      const details = await fetchDetails(ref.media_type, ref.tmdb_id, language);
      const genreIds = details.genres?.map((genre) => genre.id) ?? details.genre_ids ?? [];
      const keywords = keywordIdsFromDetails(details);
      const embedding = buildFeatureEmbedding({
        genreIds,
        releaseDate: details.release_date,
        firstAirDate: details.first_air_date,
        castIds: castIdsFromDetails(details),
        keywordIds: keywords,
        directorIds: directorIdsFromDetails(details),
      });
      const key = `${ref.media_type}:${ref.tmdb_id}`;
      result.set(key, embedding);
      upserts.push({
        media_type: ref.media_type,
        tmdb_id: ref.tmdb_id,
        model: EMBED_MODEL,
        embedding,
        dims: EMBED_DIMS,
        meta: {
          genre_ids: genreIds,
          keyword_ids: keywords.slice(0, 12),
        },
      });
    } catch (error) {
      console.warn('ensureEmbeddings failed', ref, error);
    }
  }

  if (upserts.length > 0) {
    const { error } = await admin.from('title_embeddings').upsert(upserts, {
      onConflict: 'media_type,tmdb_id,model',
    });
    if (error) {
      console.warn('title_embeddings upsert failed', error.message);
    }
  }

  return result;
}
