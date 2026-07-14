// @ts-expect-error Deno remote imports are resolved by the Supabase Edge Runtime.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-expect-error Deno npm imports are resolved by the Supabase Edge Runtime.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { EMBED_MODEL, ensureEmbeddings, type TitleRef } from '../_shared/embeddings.ts';

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

type MediaType = 'movie' | 'tv';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function isMediaType(value: unknown): value is MediaType {
  return value === 'movie' || value === 'tv';
}

function parseRefs(body: unknown): TitleRef[] {
  if (!body || typeof body !== 'object') {
    return [];
  }
  const items = (body as { items?: unknown }).items;
  if (!Array.isArray(items)) {
    return [];
  }
  const refs: TitleRef[] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const mediaType = (item as { media_type?: unknown }).media_type;
    const tmdbId = (item as { tmdb_id?: unknown }).tmdb_id;
    if (!isMediaType(mediaType) || typeof tmdbId !== 'number' || !Number.isFinite(tmdbId)) {
      continue;
    }
    refs.push({ media_type: mediaType, tmdb_id: Math.trunc(tmdbId) });
  }
  return refs;
}

serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRole) {
    return jsonResponse({ error: 'Supabase service credentials missing' }, 500);
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Missing Authorization bearer token' }, 401);
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const refs = parseRefs(body);
  if (refs.length === 0) {
    return jsonResponse({ error: 'items[] with media_type and tmdb_id required' }, 400);
  }

  const language =
    body && typeof body === 'object' && typeof (body as { language?: unknown }).language === 'string'
      ? (body as { language: string }).language
      : 'es-ES';

  const admin = createClient(supabaseUrl, serviceRole);
  const embeddings = await ensureEmbeddings(admin, refs, language);

  return jsonResponse({
    model: EMBED_MODEL,
    embeddings: Object.fromEntries(embeddings.entries()),
  });
});
