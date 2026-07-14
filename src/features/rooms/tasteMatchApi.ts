import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { MediaType } from '@/src/features/tmdb/types';

export type TasteMatchConfidence = 'none' | 'low' | 'medium' | 'high';

export type TasteMatchSuggestion = {
  tmdb_id: number;
  media_type: MediaType;
  peer_rating: number | null;
  reason: 'peer_liked' | 'peer_rated_high';
};

export type TasteMatchPair = {
  peer_user_id: string;
  peer_display_name: string | null;
  score_percent: number | null;
  confidence: TasteMatchConfidence;
  overlap_count: number;
  my_rated_count: number;
  peer_rated_count: number;
  suggestions: TasteMatchSuggestion[];
};

export type RoomTasteMatchResponse = {
  room_id: string;
  pairs: TasteMatchPair[];
  error?: string;
};

export async function fetchRoomTasteMatch(roomId: string): Promise<RoomTasteMatchResponse | null> {
  if (!isSupabaseConfigured) {
    return null;
  }

  const { data, error } = await supabase.functions.invoke<RoomTasteMatchResponse>('room-taste-match', {
    body: { room_id: roomId },
  });

  if (error) {
    throw error;
  }

  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(data.error);
  }

  if (!data || !Array.isArray(data.pairs)) {
    return null;
  }

  return data;
}
