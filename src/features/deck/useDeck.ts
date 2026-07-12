import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/providers/AuthProvider';
import { buildFeed } from '@/src/features/deck/buildFeed';
import { useExploreFilters } from '@/src/features/deck/useExploreFilters';
import {
  countUnrated,
  listByAction,
  upsertInteraction,
  type InteractionAction,
  type TitleInteraction,
} from '@/src/features/interactions/api';
import type { MediaItem, MediaType } from '@/src/features/tmdb/types';

type UseDeckResult = {
  cards: MediaItem[];
  unratedCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  swipeLike: (item: MediaItem) => Promise<void>;
  swipeNope: (item: MediaItem) => Promise<void>;
  swipeSeen: (item: MediaItem) => Promise<void>;
};

function resolveMediaType(item: MediaItem): MediaType {
  return item.media_type === 'tv' ? 'tv' : 'movie';
}

function uniqueItems(items: MediaItem[]): MediaItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${resolveMediaType(item)}:${item.id}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function loadInteractions(isConfigured: boolean): Promise<TitleInteraction[]> {
  if (!isConfigured) {
    return [];
  }

  const [likes, nopes, seens] = await Promise.all([
    listByAction('like'),
    listByAction('nope'),
    listByAction('seen'),
  ]);

  return [...likes, ...nopes, ...seens];
}

export function useDeck(): UseDeckResult {
  const { profile, isConfigured } = useAuth();
  const { ready: filtersReady, mood } = useExploreFilters();
  const [cards, setCards] = useState<MediaItem[]>([]);
  const [unratedCount, setUnratedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const load = useCallback(
    async (append: boolean) => {
      if (!profile || loadingRef.current || !filtersReady) {
        return;
      }

      loadingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const interactions = await loadInteractions(isConfigured);
        const [nextCards, nextUnratedCount] = await Promise.all([
          buildFeed(profile, interactions, { mood }),
          isConfigured ? countUnrated() : Promise.resolve(0),
        ]);

        setUnratedCount(nextUnratedCount);
        setCards((current) => {
          if (!append) {
            return nextCards;
          }

          return uniqueItems([...current, ...nextCards]);
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load deck';
        setError(message);
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [filtersReady, isConfigured, mood, profile],
  );

  const refresh = useCallback(async () => {
    await load(false);
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (cards.length > 0 && cards.length < 5) {
      void load(true);
    }
  }, [cards.length, load]);

  const swipe = useCallback(
    async (item: MediaItem, action: InteractionAction) => {
      setCards((current) => current.filter((card) => card.id !== item.id || resolveMediaType(card) !== resolveMediaType(item)));

      if (!isConfigured) {
        return;
      }

      await upsertInteraction({
        tmdb_id: item.id,
        media_type: resolveMediaType(item),
        action,
      });

      if (action === 'seen') {
        setUnratedCount((current) => current + 1);
      }
    },
    [isConfigured],
  );

  const swipeLike = useCallback((item: MediaItem) => swipe(item, 'like'), [swipe]);
  const swipeNope = useCallback((item: MediaItem) => swipe(item, 'nope'), [swipe]);
  const swipeSeen = useCallback((item: MediaItem) => swipe(item, 'seen'), [swipe]);

  return {
    cards,
    unratedCount,
    loading,
    error,
    refresh,
    swipeLike,
    swipeNope,
    swipeSeen,
  };
}
