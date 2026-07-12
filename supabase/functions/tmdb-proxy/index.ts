// @ts-expect-error Deno remote imports are resolved by the Supabase Edge Runtime.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

type TmdbAction = 'discover' | 'details' | 'similar' | 'videos' | 'providers' | 'trending' | 'search';
type MediaType = 'movie' | 'tv';

type CacheEntry = {
  expiresAt: number;
  body: unknown;
};

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return {};
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return {};
  }

  try {
    const body = await request.json();
    return isRecord(body) ? body : {};
  } catch {
    return {};
  }
}

function paramFrom(
  searchParams: URLSearchParams,
  body: Record<string, unknown>,
  key: string,
): string | undefined {
  const queryValue = searchParams.get(key);
  if (queryValue !== null && queryValue !== '') {
    return queryValue;
  }

  const bodyValue = body[key];
  if (typeof bodyValue === 'string' && bodyValue !== '') {
    return bodyValue;
  }

  if (typeof bodyValue === 'number' && Number.isFinite(bodyValue)) {
    return String(bodyValue);
  }

  return undefined;
}

function buildCacheKey(request: Request, body: Record<string, unknown>): string {
  return `${request.method}:${request.url}:${JSON.stringify(body)}`;
}

function getCached(cacheKey: string): unknown | null {
  const cached = cache.get(cacheKey);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    cache.delete(cacheKey);
    return null;
  }

  return cached.body;
}

function setCached(cacheKey: string, body: unknown): void {
  cache.set(cacheKey, {
    body,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

function isAuthorized(request: Request): boolean {
  const authorization = request.headers.get('authorization');
  const apikey = request.headers.get('apikey');

  return Boolean(authorization?.startsWith('Bearer ') || apikey);
}

function assertMediaType(mediaType: string): asserts mediaType is MediaType {
  if (mediaType !== 'movie' && mediaType !== 'tv') {
    throw new Error('media_type must be movie or tv');
  }
}

function buildTmdbUrl(searchParams: URLSearchParams, body: Record<string, unknown>): URL {
  const action = paramFrom(searchParams, body, 'action') as TmdbAction | undefined;
  const mediaType = paramFrom(searchParams, body, 'media_type') ?? 'movie';
  const id = paramFrom(searchParams, body, 'id');
  const region = paramFrom(searchParams, body, 'region')?.toUpperCase();
  const page = paramFrom(searchParams, body, 'page');
  const withGenres = paramFrom(searchParams, body, 'with_genres');
  const withRuntimeLte = paramFrom(searchParams, body, 'with_runtime_lte');
  const query = paramFrom(searchParams, body, 'query');
  const language = paramFrom(searchParams, body, 'language') ?? 'es-ES';

  if (!action) {
    throw new Error('Missing action');
  }

  assertMediaType(mediaType);

  let path: string;
  switch (action) {
    case 'discover':
      path = `/discover/${mediaType}`;
      break;
    case 'details':
      if (!id) {
        throw new Error('Missing id for details');
      }
      path = `/${mediaType}/${id}`;
      break;
    case 'similar':
      if (!id) {
        throw new Error('Missing id for similar');
      }
      path = `/${mediaType}/${id}/similar`;
      break;
    case 'videos':
      if (!id) {
        throw new Error('Missing id for videos');
      }
      path = `/${mediaType}/${id}/videos`;
      break;
    case 'providers':
      if (!id) {
        throw new Error('Missing id for providers');
      }
      path = `/${mediaType}/${id}/watch/providers`;
      break;
    case 'trending':
      path = `/trending/${mediaType}/week`;
      break;
    case 'search':
      if (!query) {
        throw new Error('Missing query for search');
      }
      path = `/search/${mediaType}`;
      break;
    default:
      throw new Error('Unsupported action');
  }

  const tmdbUrl = new URL(`${TMDB_BASE_URL}${path}`);
  tmdbUrl.searchParams.set('language', language);

  if (action === 'details') {
    tmdbUrl.searchParams.set('append_to_response', 'credits');
  }

  if (page) {
    tmdbUrl.searchParams.set('page', page);
  }

  if (withGenres) {
    tmdbUrl.searchParams.set('with_genres', withGenres);
  }

  if (withRuntimeLte) {
    tmdbUrl.searchParams.set('with_runtime_lte', withRuntimeLte);
  }

  if (query) {
    tmdbUrl.searchParams.set('query', query);
  }

  if (region) {
    tmdbUrl.searchParams.set('region', region);
    if (action === 'discover') {
      tmdbUrl.searchParams.set('watch_region', region);
    }
  }

  return tmdbUrl;
}

serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!isAuthorized(request)) {
    return jsonResponse({ error: 'Missing Authorization bearer token or apikey header' }, 401);
  }

  const token = Deno.env.get('TMDB_ACCESS_TOKEN');
  if (!token) {
    return jsonResponse({ error: 'TMDB_ACCESS_TOKEN is not configured' }, 500);
  }

  try {
    const requestUrl = new URL(request.url);
    const body = await readBody(request);
    const cacheKey = buildCacheKey(request, body);
    const cached = getCached(cacheKey);

    if (cached) {
      return jsonResponse(cached);
    }

    const tmdbUrl = buildTmdbUrl(requestUrl.searchParams, body);
    const tmdbResponse = await fetch(tmdbUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    const tmdbBody = await tmdbResponse.json();
    if (!tmdbResponse.ok) {
      return jsonResponse(tmdbBody, tmdbResponse.status);
    }

    setCached(cacheKey, tmdbBody);
    return jsonResponse(tmdbBody);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected TMDB proxy error';
    return jsonResponse({ error: message }, 400);
  }
});
