import { supabase } from '@/lib/supabase';
import type { MediaType } from '@/src/features/tmdb/types';

export type PlatformStrategy = 'intersection' | 'catalog_owner' | 'union' | 'full';
export type RoomVote = 'yes' | 'no' | 'seen';

export type Room = {
  id: string;
  host_id: string;
  catalog_owner_id: string | null;
  invite_code: string;
  platform_strategy: PlatformStrategy;
  mood: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type RoomMember = {
  room_id: string;
  user_id: string;
  role: 'host' | 'member';
  joined_at: string;
};

export type RoomSwipe = {
  id: string;
  room_id: string;
  user_id: string;
  tmdb_id: number;
  media_type: MediaType;
  vote: RoomVote;
  created_at: string;
  updated_at: string;
};

export type RoomMatch = {
  id: string;
  room_id: string;
  tmdb_id: number;
  media_type: MediaType;
  matched_at: string;
};

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('A signed-in user is required');
  }

  return data.user.id;
}

function createInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let index = 0; index < 6; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export async function createRoom(platformStrategy: PlatformStrategy = 'intersection'): Promise<Room> {
  const userId = await getCurrentUserId();
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({
      host_id: userId,
      catalog_owner_id: userId,
      invite_code: createInviteCode(),
      platform_strategy: platformStrategy,
    })
    .select('*')
    .single();

  if (roomError) {
    throw roomError;
  }

  const { error: memberError } = await supabase.from('room_members').insert({
    room_id: (room as Room).id,
    user_id: userId,
    role: 'host',
  });

  if (memberError) {
    throw memberError;
  }

  return room as Room;
}

export async function joinRoomByCode(inviteCode: string): Promise<Room> {
  const { data, error } = await supabase.rpc('join_room_by_code', {
    invite_code_input: inviteCode,
  });

  if (error) {
    throw error;
  }

  return data as Room;
}

export async function listMyRooms(): Promise<Room[]> {
  const { data, error } = await supabase
    .from('room_members')
    .select('rooms(*)')
    .order('joined_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => (row as unknown as { rooms: Room | null }).rooms)
    .filter((room): room is Room => room !== null);
}

export async function getRoom(roomId: string): Promise<Room | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as Room | null;
}

export async function setCatalogOwner(roomId: string, userId: string): Promise<Room> {
  const { data, error } = await supabase
    .from('rooms')
    .update({ catalog_owner_id: userId })
    .eq('id', roomId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as Room;
}

export async function castRoomVote(
  roomId: string,
  tmdbId: number,
  mediaType: MediaType,
  vote: RoomVote,
): Promise<RoomSwipe> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('room_swipes')
    .upsert(
      {
        room_id: roomId,
        user_id: userId,
        tmdb_id: tmdbId,
        media_type: mediaType,
        vote,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'room_id,user_id,tmdb_id,media_type' },
    )
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as RoomSwipe;
}

export async function listMatches(roomId: string): Promise<RoomMatch[]> {
  const { data, error } = await supabase
    .from('room_matches')
    .select('*')
    .eq('room_id', roomId)
    .order('matched_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as RoomMatch[];
}

export async function listRoomMembers(roomId: string): Promise<RoomMember[]> {
  const { data, error } = await supabase
    .from('room_members')
    .select('*')
    .eq('room_id', roomId)
    .order('joined_at', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as RoomMember[];
}
