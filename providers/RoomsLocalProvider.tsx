import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as Crypto from 'expo-crypto';

import { useAuth } from '@/providers/AuthProvider';
import { subscribeFlushResults, useInteractions } from '@/providers/InteractionsProvider';
import type { MediaType } from '@/src/features/tmdb/types';
import type { RoomMatch, RoomSwipe, RoomVote } from '@/src/features/rooms/api';
import {
  enqueueOutbox,
  listLocalOwnRoomSwipes,
  listLocalRoomMatches,
  listLocalRoomSwipes,
  roomVoteEntityKey,
  upsertLocalRoomMatch,
  upsertLocalRoomSwipe,
} from '@/src/features/sync/localDb';
import { pullRoomState } from '@/src/features/sync/pull';

type RoomsLocalContextValue = {
  ready: boolean;
  getOwnVotes: (roomId: string) => RoomSwipe[];
  getMatches: (roomId: string) => RoomMatch[];
  castVote: (
    roomId: string,
    tmdbId: number,
    mediaType: MediaType,
    vote: RoomVote,
  ) => Promise<RoomSwipe>;
  refreshRoom: (roomId: string) => Promise<{ swipes: RoomSwipe[]; matches: RoomMatch[] }>;
  /** Match ids newly observed after a flush/pull for a room (cleared when read via takeNewMatches). */
  takeNewMatches: (roomId: string) => RoomMatch[];
};

const RoomsLocalContext = createContext<RoomsLocalContextValue | null>(null);

export function RoomsLocalProvider({ children }: { children: ReactNode }) {
  const { user, isConfigured } = useAuth();
  const { flush } = useInteractions();
  const userId = user?.id ?? null;
  const [ready, setReady] = useState(false);
  const [swipesByRoom, setSwipesByRoom] = useState<Record<string, RoomSwipe[]>>({});
  const [matchesByRoom, setMatchesByRoom] = useState<Record<string, RoomMatch[]>>({});
  const pendingNewMatchesRef = useRef<Record<string, RoomMatch[]>>({});
  const matchesByRoomRef = useRef(matchesByRoom);
  matchesByRoomRef.current = matchesByRoom;

  const queueNewMatches = useCallback((roomId: string, newcomers: RoomMatch[]) => {
    if (newcomers.length === 0) {
      return;
    }
    const existing = pendingNewMatchesRef.current[roomId] ?? [];
    const existingIds = new Set(existing.map((match) => match.id));
    const unique = newcomers.filter((match) => !existingIds.has(match.id));
    if (unique.length === 0) {
      return;
    }
    pendingNewMatchesRef.current = {
      ...pendingNewMatchesRef.current,
      [roomId]: [...existing, ...unique],
    };
  }, []);

  const loadRoomIntoState = useCallback(async (roomId: string) => {
    const [swipes, matches] = await Promise.all([
      listLocalRoomSwipes(roomId),
      listLocalRoomMatches(roomId),
    ]);
    setSwipesByRoom((current) => ({ ...current, [roomId]: swipes }));
    setMatchesByRoom((current) => ({ ...current, [roomId]: matches }));
    return { swipes, matches };
  }, []);

  const mergeMatchesFromRemote = useCallback(
    (roomId: string, remoteMatches: RoomMatch[]) => {
      const previous = matchesByRoomRef.current[roomId] ?? [];
      const previousIds = new Set(previous.map((match) => match.id));
      const newcomers = remoteMatches.filter((match) => !previousIds.has(match.id));
      queueNewMatches(roomId, newcomers);
      setMatchesByRoom((current) => ({ ...current, [roomId]: remoteMatches }));
      void Promise.all(remoteMatches.map((match) => upsertLocalRoomMatch(match)));
    },
    [queueNewMatches],
  );

  useEffect(() => {
    setReady(Boolean(userId) && isConfigured);
    if (!userId || !isConfigured) {
      setSwipesByRoom({});
      setMatchesByRoom({});
      pendingNewMatchesRef.current = {};
    }
  }, [isConfigured, userId]);

  useEffect(() => {
    return subscribeFlushResults((result) => {
      for (const [roomId, matches] of Object.entries(result.newMatchesByRoom)) {
        mergeMatchesFromRemote(roomId, matches);
      }
    });
  }, [mergeMatchesFromRemote]);

  const castVote = useCallback(
    async (roomId: string, tmdbId: number, mediaType: MediaType, vote: RoomVote) => {
      if (!userId) {
        throw new Error('A signed-in user is required');
      }

      const now = new Date().toISOString();
      const existing = (await listLocalOwnRoomSwipes(roomId, userId)).find(
        (row) => row.tmdb_id === tmdbId && row.media_type === mediaType,
      );

      const row: RoomSwipe = {
        id: existing?.id ?? Crypto.randomUUID(),
        room_id: roomId,
        user_id: userId,
        tmdb_id: tmdbId,
        media_type: mediaType,
        vote,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      };

      await upsertLocalRoomSwipe(row, true);
      await enqueueOutbox({
        userId,
        op: 'room_vote',
        entityKey: roomVoteEntityKey(roomId, userId, tmdbId, mediaType),
        payload: {
          room_id: roomId,
          tmdb_id: tmdbId,
          media_type: mediaType,
          vote,
        },
      });
      await loadRoomIntoState(roomId);
      void flush();
      return row;
    },
    [flush, loadRoomIntoState, userId],
  );

  const refreshRoom = useCallback(
    async (roomId: string) => {
      if (!userId || !isConfigured) {
        return { swipes: [], matches: [] };
      }

      try {
        const previousIds = new Set((matchesByRoomRef.current[roomId] ?? []).map((match) => match.id));
        const { swipes, matches } = await pullRoomState(userId, roomId);
        setSwipesByRoom((current) => ({ ...current, [roomId]: swipes }));
        setMatchesByRoom((current) => ({ ...current, [roomId]: matches }));

        const newcomers = matches.filter((match) => !previousIds.has(match.id));
        queueNewMatches(roomId, newcomers);

        return { swipes, matches };
      } catch (err) {
        console.warn('Failed to refresh room local state', err);
        return loadRoomIntoState(roomId);
      }
    },
    [isConfigured, loadRoomIntoState, queueNewMatches, userId],
  );

  const takeNewMatches = useCallback((roomId: string) => {
    const taken = pendingNewMatchesRef.current[roomId] ?? [];
    if (taken.length > 0) {
      const next = { ...pendingNewMatchesRef.current };
      delete next[roomId];
      pendingNewMatchesRef.current = next;
    }
    return taken;
  }, []);

  const getOwnVotes = useCallback(
    (roomId: string) => {
      if (!userId) {
        return [];
      }
      return (swipesByRoom[roomId] ?? []).filter((swipe) => swipe.user_id === userId);
    },
    [swipesByRoom, userId],
  );

  const getMatches = useCallback(
    (roomId: string) => matchesByRoom[roomId] ?? [],
    [matchesByRoom],
  );

  const value = useMemo<RoomsLocalContextValue>(
    () => ({
      ready,
      getOwnVotes,
      getMatches,
      castVote,
      refreshRoom,
      takeNewMatches,
    }),
    [castVote, getMatches, getOwnVotes, ready, refreshRoom, takeNewMatches],
  );

  return <RoomsLocalContext.Provider value={value}>{children}</RoomsLocalContext.Provider>;
}

export function useRoomsLocal(): RoomsLocalContextValue {
  const ctx = useContext(RoomsLocalContext);
  if (!ctx) {
    throw new Error('useRoomsLocal must be used within RoomsLocalProvider');
  }
  return ctx;
}
