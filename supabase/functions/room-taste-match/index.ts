// @ts-expect-error Deno remote imports are resolved by the Supabase Edge Runtime.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-expect-error Deno npm imports are resolved by the Supabase Edge Runtime.
import { createClient } from 'npm:@supabase/supabase-js@2';

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

type MediaType = 'movie' | 'tv';
type Confidence = 'none' | 'low' | 'medium' | 'high';

type InteractionRow = {
  user_id: string;
  tmdb_id: number;
  media_type: MediaType;
  action: 'like' | 'nope' | 'seen';
  rating: number | null;
};

type SuggestedTitle = {
  tmdb_id: number;
  media_type: MediaType;
  peer_rating: number | null;
  reason: 'peer_liked' | 'peer_rated_high';
};

type PairMatch = {
  peer_user_id: string;
  peer_display_name: string | null;
  score_percent: number | null;
  confidence: Confidence;
  overlap_count: number;
  my_rated_count: number;
  peer_rated_count: number;
  suggestions: SuggestedTitle[];
};

const MIN_OVERLAP_SOFT = 3;
const MIN_OVERLAP_MEDIUM = 8;
const MIN_OVERLAP_HIGH = 20;
const MIN_RATED_FOR_HIGH = 15;
const SUGGESTION_LIMIT = 8;

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

function mediaKey(mediaType: MediaType, id: number): string {
  return `${mediaType}:${id}`;
}

type UserSignals = {
  ratings: Map<string, number>;
  positives: Map<string, { rating: number | null; reason: SuggestedTitle['reason'] }>;
  interacted: Set<string>;
  ratedCount: number;
};

function buildSignals(rows: InteractionRow[]): UserSignals {
  const ratings = new Map<string, number>();
  const positives = new Map<string, { rating: number | null; reason: SuggestedTitle['reason'] }>();
  const interacted = new Set<string>();
  let ratedCount = 0;

  for (const row of rows) {
    const key = mediaKey(row.media_type, row.tmdb_id);
    interacted.add(key);

    if (row.action === 'seen' && row.rating != null) {
      ratings.set(key, row.rating);
      ratedCount += 1;
      if (row.rating >= 8) {
        positives.set(key, { rating: row.rating, reason: 'peer_rated_high' });
      }
    }

    if (row.action === 'like') {
      positives.set(key, { rating: null, reason: 'peer_liked' });
    }
  }

  return { ratings, positives, interacted, ratedCount };
}

function confidenceFor(overlap: number, myRated: number, peerRated: number): Confidence {
  if (overlap < MIN_OVERLAP_SOFT || Math.min(myRated, peerRated) < 5) {
    return 'none';
  }
  if (overlap < MIN_OVERLAP_MEDIUM) {
    return 'low';
  }
  if (overlap >= MIN_OVERLAP_HIGH && Math.min(myRated, peerRated) >= MIN_RATED_FOR_HIGH) {
    return 'high';
  }
  return 'medium';
}

function scorePair(me: UserSignals, peer: UserSignals): {
  score_percent: number | null;
  confidence: Confidence;
  overlap_count: number;
} {
  const overlapKeys: string[] = [];
  for (const key of me.ratings.keys()) {
    if (peer.ratings.has(key)) {
      overlapKeys.push(key);
    }
  }

  const overlap_count = overlapKeys.length;
  const confidence = confidenceFor(overlap_count, me.ratedCount, peer.ratedCount);

  if (overlap_count < MIN_OVERLAP_SOFT) {
    return { score_percent: null, confidence: 'none', overlap_count };
  }

  let agreementSum = 0;
  for (const key of overlapKeys) {
    const a = me.ratings.get(key)!;
    const b = peer.ratings.get(key)!;
    agreementSum += 1 - Math.min(1, Math.abs(a - b) / 9);
  }
  const agreement = agreementSum / overlap_count;

  const posA = new Set(me.positives.keys());
  const posB = new Set(peer.positives.keys());
  let inter = 0;
  for (const key of posA) {
    if (posB.has(key)) {
      inter += 1;
    }
  }
  const union = posA.size + posB.size - inter;
  const jaccard = union > 0 ? inter / union : 0;

  const blended = 0.7 * agreement + 0.3 * jaccard;
  const score_percent = Math.round(Math.max(0, Math.min(1, blended)) * 100);

  return { score_percent, confidence, overlap_count };
}

function suggestForPeer(me: UserSignals, peer: UserSignals): SuggestedTitle[] {
  const candidates: Array<SuggestedTitle & { sort: number }> = [];

  for (const [key, meta] of peer.positives.entries()) {
    if (me.interacted.has(key)) {
      continue;
    }
    const [mediaType, idRaw] = key.split(':');
    if (mediaType !== 'movie' && mediaType !== 'tv') {
      continue;
    }
    const tmdb_id = Number(idRaw);
    if (!Number.isFinite(tmdb_id)) {
      continue;
    }
    candidates.push({
      tmdb_id,
      media_type: mediaType,
      peer_rating: meta.rating,
      reason: meta.reason,
      sort: meta.rating ?? 7.5,
    });
  }

  candidates.sort((a, b) => b.sort - a.sort);
  return candidates.slice(0, SUGGESTION_LIMIT).map(({ sort: _sort, ...rest }) => rest);
}

serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !serviceRole || !anonKey) {
    return jsonResponse({ error: 'Supabase credentials missing' }, 500);
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Missing Authorization bearer token' }, 401);
  }

  let body: Record<string, unknown> = {};
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === 'object') {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    body = {};
  }

  const roomId = typeof body.room_id === 'string' ? body.room_id : null;
  if (!roomId) {
    return jsonResponse({ error: 'room_id is required' }, 400);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(supabaseUrl, serviceRole);

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const { data: membership, error: membershipError } = await admin
    .from('room_members')
    .select('user_id')
    .eq('room_id', roomId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (membershipError) {
    return jsonResponse({ error: membershipError.message }, 400);
  }
  if (!membership) {
    return jsonResponse({ error: 'Not a member of this room' }, 403);
  }

  const { data: members, error: membersError } = await admin
    .from('room_members')
    .select('user_id')
    .eq('room_id', roomId)
    .order('joined_at', { ascending: true });

  if (membersError) {
    return jsonResponse({ error: membersError.message }, 400);
  }

  const memberIds = (members ?? []).map((row) => row.user_id as string);
  if (memberIds.length < 2) {
    return jsonResponse({ room_id: roomId, pairs: [] as PairMatch[] });
  }

  const [{ data: interactions, error: interactionsError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      admin
        .from('title_interactions')
        .select('user_id, tmdb_id, media_type, action, rating')
        .in('user_id', memberIds)
        .limit(4000),
      admin.from('profiles').select('id, display_name').in('id', memberIds),
    ]);

  if (interactionsError) {
    return jsonResponse({ error: interactionsError.message }, 400);
  }
  if (profilesError) {
    return jsonResponse({ error: profilesError.message }, 400);
  }

  const byUser = new Map<string, InteractionRow[]>();
  for (const id of memberIds) {
    byUser.set(id, []);
  }
  for (const row of (interactions ?? []) as InteractionRow[]) {
    const list = byUser.get(row.user_id);
    if (list) {
      list.push(row);
    }
  }

  const displayNameById = new Map<string, string | null>();
  for (const row of profiles ?? []) {
    displayNameById.set(row.id as string, (row.display_name as string | null) ?? null);
  }

  const meSignals = buildSignals(byUser.get(user.id) ?? []);
  const pairs: PairMatch[] = [];

  for (const peerId of memberIds) {
    if (peerId === user.id) {
      continue;
    }
    const peerSignals = buildSignals(byUser.get(peerId) ?? []);
    const scored = scorePair(meSignals, peerSignals);
    pairs.push({
      peer_user_id: peerId,
      peer_display_name: displayNameById.get(peerId) ?? null,
      score_percent: scored.confidence === 'none' ? null : scored.score_percent,
      confidence: scored.confidence,
      overlap_count: scored.overlap_count,
      my_rated_count: meSignals.ratedCount,
      peer_rated_count: peerSignals.ratedCount,
      suggestions: suggestForPeer(meSignals, peerSignals),
    });
  }

  return jsonResponse({ room_id: roomId, pairs });
});
