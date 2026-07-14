import { listAllInteractions, type TitleInteraction } from '@/src/features/interactions/api';
import {
  listMatches,
  listRoomSwipes,
  type RoomMatch,
  type RoomSwipe,
} from '@/src/features/rooms/api';
import {
  hasPendingOutbox,
  interactionEntityKey,
  listLocalInteractions,
  listLocalRoomMatches,
  listLocalRoomSwipes,
  roomVoteEntityKey,
  upsertLocalInteraction,
  upsertLocalRoomMatch,
  upsertLocalRoomSwipe,
} from '@/src/features/sync/localDb';

export async function pullInteractions(userId: string): Promise<TitleInteraction[]> {
  const remote = await listAllInteractions();

  for (const row of remote) {
    const key = interactionEntityKey(userId, row.tmdb_id, row.media_type);
    if (await hasPendingOutbox(userId, key)) {
      continue;
    }
    await upsertLocalInteraction(row);
  }

  return listLocalInteractions(userId);
}

export async function pullRoomState(
  userId: string,
  roomId: string,
): Promise<{ swipes: RoomSwipe[]; matches: RoomMatch[] }> {
  const [remoteSwipes, remoteMatches] = await Promise.all([
    listRoomSwipes(roomId),
    listMatches(roomId),
  ]);

  for (const swipe of remoteSwipes) {
    const key = roomVoteEntityKey(swipe.room_id, swipe.user_id, swipe.tmdb_id, swipe.media_type);
    // Only skip overwrite for *own* pending votes; peer rows always merge.
    if (swipe.user_id === userId && (await hasPendingOutbox(userId, key))) {
      continue;
    }
    await upsertLocalRoomSwipe(swipe);
  }

  for (const match of remoteMatches) {
    await upsertLocalRoomMatch(match);
  }

  const [swipes, matches] = await Promise.all([
    listLocalRoomSwipes(roomId),
    listLocalRoomMatches(roomId),
  ]);

  return { swipes, matches };
}
