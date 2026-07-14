import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/providers/AuthProvider';
import { useInteractions } from '@/providers/InteractionsProvider';
import { buildFeed } from '@/src/features/deck/buildFeed';
import { useExploreFilters } from '@/src/features/deck/useExploreFilters';
import type { InteractionAction } from '@/src/features/interactions/api';
import type { MediaItem, MediaType } from '@/src/features/tmdb/types';

const PREFETCH_THRESHOLD = 12;
/** First paint: one page only; prefetch fills to PREFETCH_THRESHOLD in background. */
const INITIAL_PAGES = 1;
const PREFETCH_PAGES = 2;
const EMPTY_BATCH_COOLDOWN_MS = 1200;

type UseDeckResult = {
  cards: MediaItem[];
  unratedCount: number;
  loading: boolean;
  exhausted: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  swipeLike: (item: MediaItem) => Promise<void>;
  swipeNope: (item: MediaItem) => Promise<void>;
  swipeSeen: (item: MediaItem) => Promise<void>;
};

function resolveMediaType(item: MediaItem): MediaType {
  return item.media_type === 'tv' ? 'tv' : 'movie';
}

function itemKey(item: MediaItem): string {
  return `${resolveMediaType(item)}:${item.id}`;
}

function uniqueItems(items: MediaItem[]): MediaItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = itemKey(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function useDeck(): UseDeckResult {
  const { profile, isConfigured } = useAuth();
  const { hydrated, mood } = useExploreFilters();
  const {
    ready: interactionsReady,
    interactions,
    countUnrated,
    upsert,
  } = useInteractions();
  const [cards, setCards] = useState<MediaItem[]>([]);
  const [unratedCount, setUnratedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prefetchTick, setPrefetchTick] = useState(0);

  const loadingRef = useRef(false);
  const pageRef = useRef(0);
  const seenKeysRef = useRef<Set<string>>(new Set());
  const cooldownUntilRef = useRef(0);
  const interactionsRef = useRef(interactions);
  interactionsRef.current = interactions;
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const moodRef = useRef(mood);
  moodRef.current = mood;
  const countUnratedRef = useRef(countUnrated);
  countUnratedRef.current = countUnrated;
  const bootstrappedRef = useRef(false);

  const canFetch = Boolean(profile) && hydrated && (!isConfigured || interactionsReady);

  const loadMore = useCallback(
    async (reset: boolean) => {
      const activeProfile = profileRef.current;
      if (!activeProfile || loadingRef.current || (isConfigured && !interactionsReady)) {
        return;
      }

      loadingRef.current = true;
      if (reset && !bootstrappedRef.current) {
        setLoading(true);
      }
      setError(null);

      try {
        if (reset) {
          pageRef.current = 0;
          seenKeysRef.current = new Set();
          cooldownUntilRef.current = 0;
        }

        const currentInteractions = interactionsRef.current;
        const activeMood = moodRef.current;
        const pagesToFetch = reset ? INITIAL_PAGES : PREFETCH_PAGES;
        const collected: MediaItem[] = [];

        for (let i = 0; i < pagesToFetch; i += 1) {
          pageRef.current += 1;
          const batch = await buildFeed(activeProfile, currentInteractions, {
            mood: activeMood,
            page: pageRef.current,
            excludeKeys: seenKeysRef.current,
          });
          const fresh = batch.filter((item) => !seenKeysRef.current.has(itemKey(item)));
          for (const item of fresh) {
            seenKeysRef.current.add(itemKey(item));
          }
          collected.push(...fresh);
        }

        let rescue = 0;
        while (collected.length === 0 && rescue < 6) {
          pageRef.current += 1;
          rescue += 1;
          const batch = await buildFeed(activeProfile, currentInteractions, {
            mood: activeMood,
            page: pageRef.current,
            excludeKeys: seenKeysRef.current,
          });
          const fresh = batch.filter((item) => !seenKeysRef.current.has(itemKey(item)));
          for (const item of fresh) {
            seenKeysRef.current.add(itemKey(item));
          }
          collected.push(...fresh);
        }

        setUnratedCount(isConfigured ? countUnratedRef.current() : 0);

        if (collected.length === 0) {
          cooldownUntilRef.current = Date.now() + EMPTY_BATCH_COOLDOWN_MS;
        }

        if (reset) {
          setCards(uniqueItems(collected));
        } else if (collected.length > 0) {
          setCards((current) => uniqueItems([...current, ...collected]));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load deck';
        setError(message);
        cooldownUntilRef.current = Date.now() + EMPTY_BATCH_COOLDOWN_MS;
      } finally {
        loadingRef.current = false;
        setLoading(false);
        bootstrappedRef.current = true;
      }
    },
    [interactionsReady, isConfigured],
  );

  const refresh = useCallback(async () => {
    await loadMore(true);
  }, [loadMore]);

  // Bootstrap once when ready. Ignore brief canFetch flickers after a successful load
  // (e.g. interactions re-hydrate) so we don't re-fetch the whole deck.
  useEffect(() => {
    if (!canFetch) {
      if (!profile || !hydrated) {
        bootstrappedRef.current = false;
        setLoading(true);
      }
      return;
    }

    if (bootstrappedRef.current) {
      return;
    }

    void loadMore(true);
  }, [canFetch, hydrated, loadMore, profile]);

  useEffect(() => {
    setUnratedCount(isConfigured ? countUnrated() : 0);
  }, [countUnrated, interactions, isConfigured]);

  useEffect(() => {
    if (!bootstrappedRef.current || loadingRef.current) {
      return;
    }

    if (cards.length >= PREFETCH_THRESHOLD) {
      return;
    }

    const wait = cooldownUntilRef.current - Date.now();
    if (wait > 0) {
      const timer = setTimeout(() => setPrefetchTick((tick) => tick + 1), wait);
      return () => clearTimeout(timer);
    }

    void loadMore(false);
  }, [cards.length, loadMore, prefetchTick]);

  const swipe = useCallback(
    async (item: MediaItem, action: InteractionAction) => {
      setCards((current) =>
        current.filter(
          (card) => card.id !== item.id || resolveMediaType(card) !== resolveMediaType(item),
        ),
      );

      if (!isConfigured) {
        return;
      }

      try {
        await upsert({
          tmdb_id: item.id,
          media_type: resolveMediaType(item),
          action,
        });

        if (action === 'seen') {
          setUnratedCount((current) => current + 1);
        }
      } catch (err) {
        console.warn('Failed to save swipe', err);
        setCards((current) => [item, ...current.filter((card) => card.id !== item.id)]);
      }
    },
    [isConfigured, upsert],
  );

  const swipeLike = useCallback((item: MediaItem) => swipe(item, 'like'), [swipe]);
  const swipeNope = useCallback((item: MediaItem) => swipe(item, 'nope'), [swipe]);
  const swipeSeen = useCallback((item: MediaItem) => swipe(item, 'seen'), [swipe]);

  return {
    cards,
    unratedCount,
    loading,
    exhausted: false,
    error,
    refresh,
    swipeLike,
    swipeNope,
    swipeSeen,
  };
}
