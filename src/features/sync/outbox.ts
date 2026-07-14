import {
  restoreNope as restoreNopeRemote,
  upsertInteraction as upsertInteractionRemote,
  type UpsertInteractionInput,
} from '@/src/features/interactions/api';
import {
  castRoomVote as castRoomVoteRemote,
  listMatches,
  type RoomMatch,
  type RoomVote,
} from '@/src/features/rooms/api';
import type { MediaType } from '@/src/features/tmdb/types';
import {
  bumpOutboxAttempts,
  deleteOutboxRow,
  listOutbox,
  type OutboxRow,
} from '@/src/features/sync/localDb';

export type FlushedRoomVote = {
  roomId: string;
  tmdbId: number;
  mediaType: MediaType;
  vote: RoomVote;
};

export type FlushResult = {
  flushedRoomVotes: FlushedRoomVote[];
  newMatchesByRoom: Record<string, RoomMatch[]>;
  errors: string[];
};

let flushPromise: Promise<FlushResult> | null = null;

async function processOutboxRow(row: OutboxRow): Promise<FlushedRoomVote | null> {
  const payload = JSON.parse(row.payload) as Record<string, unknown>;

  switch (row.op) {
    case 'interaction_upsert': {
      await upsertInteractionRemote(payload as UpsertInteractionInput);
      return null;
    }
    case 'interaction_delete_nope': {
      await restoreNopeRemote(Number(payload.tmdb_id), payload.media_type as MediaType);
      return null;
    }
    case 'room_vote': {
      const roomId = String(payload.room_id);
      const tmdbId = Number(payload.tmdb_id);
      const mediaType = payload.media_type as MediaType;
      const vote = payload.vote as RoomVote;
      await castRoomVoteRemote(roomId, tmdbId, mediaType, vote);
      return { roomId, tmdbId, mediaType, vote };
    }
    default:
      throw new Error(`Unknown outbox op: ${row.op}`);
  }
}

/**
 * Flush pending local mutations to Supabase.
 * After room votes, pulls matches for affected rooms so callers can celebrate deferred matches.
 * Concurrent callers share the same in-flight flush.
 */
export async function flushOutbox(userId: string): Promise<FlushResult> {
  if (!userId) {
    return { flushedRoomVotes: [], newMatchesByRoom: {}, errors: [] };
  }

  if (flushPromise) {
    return flushPromise;
  }

  flushPromise = (async (): Promise<FlushResult> => {
    const flushedRoomVotes: FlushedRoomVote[] = [];
    const errors: string[] = [];

    const rows = await listOutbox(userId);
    for (const row of rows) {
      try {
        const roomVote = await processOutboxRow(row);
        if (roomVote) {
          flushedRoomVotes.push(roomVote);
        }
        await deleteOutboxRow(row.id);
      } catch (err) {
        await bumpOutboxAttempts(row.id);
        const message = err instanceof Error ? err.message : 'Sync failed';
        errors.push(message);
        console.warn('Outbox flush failed', row.op, message);
      }
    }

    const roomIds = [...new Set(flushedRoomVotes.map((vote) => vote.roomId))];
    const newMatchesByRoom: Record<string, RoomMatch[]> = {};

    for (const roomId of roomIds) {
      try {
        newMatchesByRoom[roomId] = await listMatches(roomId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to pull matches';
        errors.push(message);
      }
    }

    return { flushedRoomVotes, newMatchesByRoom, errors };
  })().finally(() => {
    flushPromise = null;
  });

  return flushPromise;
}
