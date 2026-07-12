// @ts-expect-error Deno remote imports are resolved by the Supabase Edge Runtime.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// @ts-expect-error Deno npm imports are resolved by the Supabase Edge Runtime.
import { createClient } from 'npm:@supabase/supabase-js@2';

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

type NotifyPayload = {
  room_id?: string;
  match?: {
    tmdb_id?: number;
    media_type?: 'movie' | 'tv';
  };
};

type MemberTokenRow = {
  profiles: {
    expo_push_token: string | null;
  } | null;
};

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

serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  // Configure EXPO_ACCESS_TOKEN as an Edge Function secret for production push sends.
  const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN');

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Supabase service credentials are not configured' }, 500);
  }

  const payload = (await request.json().catch(() => ({}))) as NotifyPayload;
  if (!payload.room_id) {
    return jsonResponse({ error: 'room_id is required' }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase
    .from('room_members')
    .select('profiles(expo_push_token)')
    .eq('room_id', payload.room_id);

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  const tokens = ((data ?? []) as MemberTokenRow[])
    .map((row) => row.profiles?.expo_push_token)
    .filter((token): token is string => Boolean(token));

  if (tokens.length === 0) {
    return jsonResponse({ sent: 0 });
  }

  const messages = tokens.map((to) => ({
    to,
    sound: 'default',
    title: 'Match Cut',
    body: 'New room match',
    data: {
      room_id: payload.room_id,
      match: payload.match ?? null,
    },
  }));

  const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(expoAccessToken ? { Authorization: `Bearer ${expoAccessToken}` } : {}),
    },
    body: JSON.stringify(messages),
  });

  const result = await expoResponse.json().catch(() => ({}));
  return jsonResponse({ sent: tokens.length, result }, expoResponse.ok ? 200 : 502);
});
