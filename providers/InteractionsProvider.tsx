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
import { AppState, type AppStateStatus } from 'react-native';
import * as Crypto from 'expo-crypto';

import { useAuth } from '@/providers/AuthProvider';
import type {
  InteractionAction,
  TitleInteraction,
  UpsertInteractionInput,
} from '@/src/features/interactions/api';
import type { MediaType } from '@/src/features/tmdb/types';
import {
  clearAllLocalData,
  clearUserLocalData,
  countLocalUnrated,
  deleteLocalInteraction,
  enqueueOutbox,
  getLocalInteraction,
  interactionEntityKey,
  listLocalInteractions,
  listLocalInteractionsByAction,
  writeLocalInteraction,
} from '@/src/features/sync/localDb';
import { flushOutbox, type FlushResult } from '@/src/features/sync/outbox';
import { pullInteractions } from '@/src/features/sync/pull';

const FLUSH_INTERVAL_MS = 30_000;

type InteractionsContextValue = {
  ready: boolean;
  interactions: TitleInteraction[];
  listByAction: (action: InteractionAction) => TitleInteraction[];
  countUnrated: () => number;
  upsert: (input: UpsertInteractionInput) => Promise<TitleInteraction>;
  restoreNope: (tmdbId: number, mediaType: MediaType) => Promise<void>;
  setRating: (tmdbId: number, mediaType: MediaType, rating: number | null) => Promise<TitleInteraction>;
  refreshFromCloud: () => Promise<void>;
  flush: () => Promise<FlushResult>;
};

const InteractionsContext = createContext<InteractionsContextValue | null>(null);

type FlushListener = (result: FlushResult) => void;

const flushListeners = new Set<FlushListener>();

export function subscribeFlushResults(listener: FlushListener): () => void {
  flushListeners.add(listener);
  return () => {
    flushListeners.delete(listener);
  };
}

function notifyFlushListeners(result: FlushResult) {
  for (const listener of flushListeners) {
    listener(result);
  }
}

export function InteractionsProvider({ children }: { children: ReactNode }) {
  const { user, isConfigured } = useAuth();
  const userId = user?.id ?? null;
  const [ready, setReady] = useState(false);
  const [interactions, setInteractions] = useState<TitleInteraction[]>([]);
  const activeUserRef = useRef<string | null>(null);
  const flushPromiseRef = useRef<Promise<FlushResult> | null>(null);

  const reloadFromLocal = useCallback(async (uid: string) => {
    const rows = await listLocalInteractions(uid);
    setInteractions(rows);
  }, []);

  const flush = useCallback(async (): Promise<FlushResult> => {
    if (!userId || !isConfigured) {
      return { flushedRoomVotes: [], newMatchesByRoom: {}, errors: [] };
    }

    if (flushPromiseRef.current) {
      return flushPromiseRef.current;
    }

    flushPromiseRef.current = (async () => {
      const result = await flushOutbox(userId);
      notifyFlushListeners(result);
      return result;
    })().finally(() => {
      flushPromiseRef.current = null;
    });

    return flushPromiseRef.current;
  }, [isConfigured, userId]);

  const flushRef = useRef(flush);
  flushRef.current = flush;
  const reloadFromLocalRef = useRef(reloadFromLocal);
  reloadFromLocalRef.current = reloadFromLocal;

  const refreshFromCloud = useCallback(async () => {
    if (!userId || !isConfigured) {
      setInteractions([]);
      return;
    }
    const rows = await pullInteractions(userId);
    setInteractions(rows);
  }, [isConfigured, userId]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const sameUser = Boolean(userId && activeUserRef.current === userId);

      // Avoid ready=false flicker for the same session (it forces Explore to wait again).
      if (!sameUser) {
        setReady(false);
      }

      if (!userId || !isConfigured) {
        if (activeUserRef.current) {
          await clearUserLocalData(activeUserRef.current);
          activeUserRef.current = null;
        }
        if (!cancelled) {
          setInteractions([]);
          setReady(true);
        }
        return;
      }

      if (activeUserRef.current && activeUserRef.current !== userId) {
        await clearUserLocalData(activeUserRef.current);
      }
      activeUserRef.current = userId;

      try {
        const local = await listLocalInteractions(userId);
        if (!cancelled) {
          setInteractions(local);
          setReady(true);
        }

        void pullInteractions(userId)
          .then(async () => {
            if (!cancelled) {
              await reloadFromLocalRef.current(userId);
            }
          })
          .catch((err) => {
            console.warn('Failed to pull interactions', err);
          })
          .finally(() => {
            if (!cancelled) {
              void flushRef.current();
            }
          });
      } catch (err) {
        console.warn('Failed to hydrate interactions', err);
        if (!cancelled) {
          await reloadFromLocalRef.current(userId);
          setReady(true);
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [isConfigured, userId]);

  useEffect(() => {
    if (!userId || !isConfigured) {
      return;
    }

    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        void refreshFromCloud().then(() => flush());
      } else if (state === 'background' || state === 'inactive') {
        void flush();
      }
    };

    const sub = AppState.addEventListener('change', onAppState);
    const timer = setInterval(() => {
      void flush();
    }, FLUSH_INTERVAL_MS);

    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [flush, isConfigured, refreshFromCloud, userId]);

  const upsert = useCallback(
    async (input: UpsertInteractionInput): Promise<TitleInteraction> => {
      if (!userId) {
        throw new Error('A signed-in user is required');
      }

      const now = new Date().toISOString();
      const existing = await getLocalInteraction(userId, input.tmdb_id, input.media_type);
      const row: TitleInteraction = {
        id: existing?.id ?? Crypto.randomUUID(),
        user_id: userId,
        tmdb_id: input.tmdb_id,
        media_type: input.media_type,
        action: input.action,
        rating: input.rating ?? null,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      };

      await writeLocalInteraction(row);
      await enqueueOutbox({
        userId,
        op: 'interaction_upsert',
        entityKey: interactionEntityKey(userId, row.tmdb_id, row.media_type),
        payload: {
          tmdb_id: row.tmdb_id,
          media_type: row.media_type,
          action: row.action,
          rating: row.rating,
        },
      });
      await reloadFromLocal(userId);
      void flush();
      return row;
    },
    [flush, reloadFromLocal, userId],
  );

  const restoreNope = useCallback(
    async (tmdbId: number, mediaType: MediaType) => {
      if (!userId) {
        throw new Error('A signed-in user is required');
      }

      await deleteLocalInteraction(userId, tmdbId, mediaType);
      await enqueueOutbox({
        userId,
        op: 'interaction_delete_nope',
        entityKey: interactionEntityKey(userId, tmdbId, mediaType),
        payload: { tmdb_id: tmdbId, media_type: mediaType },
      });
      await reloadFromLocal(userId);
      void flush();
    },
    [flush, reloadFromLocal, userId],
  );

  const setRating = useCallback(
    async (tmdbId: number, mediaType: MediaType, rating: number | null) => {
      if (rating !== null && (rating < 1 || rating > 10)) {
        throw new Error('rating must be between 1 and 10');
      }
      return upsert({
        tmdb_id: tmdbId,
        media_type: mediaType,
        action: 'seen',
        rating,
      });
    },
    [upsert],
  );

  const byAction = useMemo(
    () => ({
      like: interactions.filter((row) => row.action === 'like'),
      nope: interactions.filter((row) => row.action === 'nope'),
      seen: interactions.filter((row) => row.action === 'seen'),
    }),
    [interactions],
  );

  const listByAction = useCallback(
    (action: InteractionAction) => byAction[action],
    [byAction],
  );

  const countUnrated = useCallback(
    () => byAction.seen.filter((row) => row.rating == null).length,
    [byAction],
  );

  const value = useMemo<InteractionsContextValue>(
    () => ({
      ready,
      interactions,
      listByAction,
      countUnrated,
      upsert,
      restoreNope,
      setRating,
      refreshFromCloud,
      flush,
    }),
    [
      countUnrated,
      flush,
      interactions,
      listByAction,
      ready,
      refreshFromCloud,
      restoreNope,
      setRating,
      upsert,
    ],
  );

  return <InteractionsContext.Provider value={value}>{children}</InteractionsContext.Provider>;
}

export function useInteractions(): InteractionsContextValue {
  const ctx = useContext(InteractionsContext);
  if (!ctx) {
    throw new Error('useInteractions must be used within InteractionsProvider');
  }
  return ctx;
}

/** Escape hatch for logout wipe before auth clears user. */
export async function wipeLocalSyncData(): Promise<void> {
  await clearAllLocalData();
}

export async function readLocalInteractionsByAction(
  userId: string,
  action: InteractionAction,
): Promise<TitleInteraction[]> {
  return listLocalInteractionsByAction(userId, action);
}

export async function readLocalUnratedCount(userId: string): Promise<number> {
  return countLocalUnrated(userId);
}
