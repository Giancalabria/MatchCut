import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/providers/AuthProvider';
import { useInteractions } from '@/providers/InteractionsProvider';
import { useThemeColors } from '@/providers/PreferencesProvider';
import { useRoomsLocal } from '@/providers/RoomsLocalProvider';
import { buildFeed } from '@/src/features/deck/buildFeed';
import { SwipeDeck } from '@/src/features/deck/SwipeDeck';
import {
  getRoom,
  listRoomMembers,
  setCatalogOwner,
  type Room,
  type RoomMatch,
  type RoomMember,
} from '@/src/features/rooms/api';
import { MatchCelebration } from '@/src/features/rooms/MatchCelebration';
import { RoomTasteMatch } from '@/src/features/rooms/RoomTasteMatch';
import { getDetails } from '@/src/features/tmdb/client';
import { posterUrl } from '@/src/features/tmdb/images';
import type { MediaItem, MediaType } from '@/src/features/tmdb/types';
import { AppText, Button, Chip, ScreenHeader } from '@/src/ui';
import { radii } from '@/theme/radii';
import { layout, space } from '@/theme/spacing';
import { typography } from '@/theme/typography';

function resolveMediaType(item: MediaItem): MediaType {
  return item.media_type === 'tv' ? 'tv' : 'movie';
}

function itemKey(mediaType: MediaType, tmdbId: number): string {
  return `${mediaType}:${tmdbId}`;
}

type MatchRow = {
  match: RoomMatch;
  title: string;
  poster: string | null;
};

export default function RoomScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { profile, isConfigured } = useAuth();
  const { interactions, ready: interactionsReady, flush } = useInteractions();
  const { castVote, refreshRoom, getMatches, takeNewMatches } = useRoomsLocal();
  const params = useLocalSearchParams();
  const roomId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [matches, setMatches] = useState<RoomMatch[]>([]);
  const [matchRows, setMatchRows] = useState<MatchRow[]>([]);
  const [cards, setCards] = useState<MediaItem[]>([]);
  const [celebration, setCelebration] = useState<RoomMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyCelebrationFromPending = useCallback(() => {
    if (!roomId) {
      return;
    }
    const newcomers = takeNewMatches(roomId);
    if (newcomers.length > 0) {
      setCelebration(newcomers[0] ?? null);
    }
  }, [roomId, takeNewMatches]);

  const loadRoom = useCallback(async () => {
    if (!roomId || !profile || (isConfigured && !interactionsReady)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const rankingInteractions = isConfigured ? interactions : [];
      const [nextRoom, nextMembers, localRoom, nextCards] = await Promise.all([
        getRoom(roomId),
        listRoomMembers(roomId),
        refreshRoom(roomId),
        buildFeed(profile, rankingInteractions, { excludeInteracted: false }),
      ]);

      const votedKeys = new Set(
        localRoom.swipes
          .filter((swipe) => swipe.user_id === profile.id)
          .map((swipe) => itemKey(swipe.media_type, swipe.tmdb_id)),
      );

      setRoom(nextRoom);
      setMembers(nextMembers);
      setMatches(localRoom.matches);
      setCards(
        nextCards.filter((card) => !votedKeys.has(itemKey(resolveMediaType(card), card.id))),
      );
      applyCelebrationFromPending();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  }, [
    applyCelebrationFromPending,
    interactions,
    interactionsReady,
    isConfigured,
    profile,
    refreshRoom,
    roomId,
    t,
  ]);

  useEffect(() => {
    void loadRoom();
  }, [loadRoom]);

  useEffect(() => {
    if (!roomId) {
      return;
    }
    setMatches(getMatches(roomId));
  }, [getMatches, roomId]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      matches.map(async (match) => {
        const details = await getDetails(match.media_type, match.tmdb_id);
        return {
          match,
          title:
            details?.title ??
            details?.name ??
            details?.original_title ??
            details?.original_name ??
            `${match.media_type} #${match.tmdb_id}`,
          poster: posterUrl(details?.poster_path, 'w185'),
        } satisfies MatchRow;
      }),
    ).then((rows) => {
      if (!cancelled) {
        setMatchRows(rows);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [matches]);

  async function vote(item: MediaItem, voteValue: 'yes' | 'no' | 'seen') {
    if (!roomId) {
      return;
    }

    setCards((current) =>
      current.filter((card) => card.id !== item.id || resolveMediaType(card) !== resolveMediaType(item)),
    );

    try {
      await castVote(roomId, item.id, resolveMediaType(item), voteValue);
      const result = await flush();
      const syncedMatches = result.newMatchesByRoom[roomId];
      if (syncedMatches) {
        setMatches(syncedMatches);
      } else {
        setMatches(getMatches(roomId));
      }
      applyCelebrationFromPending();
    } catch (err) {
      console.warn('Failed to save room vote', err);
      setCards((current) => [item, ...current.filter((card) => card.id !== item.id)]);
    }
  }

  async function handleSetCatalogOwner(userId: string) {
    if (!roomId) {
      return;
    }
    setRoom(await setCatalogOwner(roomId, userId));
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.cta} />
      </View>
    );
  }

  if (error || !room) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <AppText color={colors.nope} style={{ fontFamily: typography.bodyBold, textAlign: 'center' }}>
          {error ?? t('rooms.notFound')}
        </AppText>
        <Button label={t('common.back')} onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.bg }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top, layout.safeTopMin) },
      ]}
    >
      <ScreenHeader
        title={t('rooms.roomName', { code: room.invite_code })}
        onBack={() => router.back()}
      />
      <AppText variant="caption" muted>
        {t(`rooms.strategy.${room.platform_strategy}`)}
      </AppText>

      <View style={styles.deckArea}>
        {cards.length > 0 ? (
          <SwipeDeck
            cards={cards}
            onOpenDetail={(item) =>
              router.push({
                pathname: '/title/[mediaType]/[id]',
                params: { mediaType: resolveMediaType(item), id: String(item.id) },
              })
            }
            onSwipeLike={(item) => {
              void vote(item, 'yes');
            }}
            onSwipeNope={(item) => {
              void vote(item, 'no');
            }}
            onSwipeSeen={(item) => {
              void vote(item, 'seen');
            }}
          />
        ) : (
          <AppText muted>{t('rooms.emptyDeck')}</AppText>
        )}
      </View>

      <AppText variant="section">{t('rooms.catalogOwner')}</AppText>
      <View style={styles.memberRow}>
        {members.map((member, index) => (
          <Chip
            key={member.user_id}
            label={member.role === 'host' ? t('rooms.host') : `${t('rooms.member')} ${index + 1}`}
            selected={room.catalog_owner_id === member.user_id}
            onPress={() => {
              void handleSetCatalogOwner(member.user_id);
            }}
          />
        ))}
      </View>

      <RoomTasteMatch roomId={room.id} memberCount={members.length} />

      <AppText variant="section">{t('rooms.matches')}</AppText>
      {matchRows.length === 0 ? (
        <AppText muted>{t('rooms.noMatches')}</AppText>
      ) : (
        matchRows.map((row) => (
          <Pressable
            key={row.match.id}
            onPress={() =>
              router.push({
                pathname: '/title/[mediaType]/[id]',
                params: { mediaType: row.match.media_type, id: String(row.match.tmdb_id) },
              })
            }
            style={[styles.matchRow, { backgroundColor: colors.surface, borderColor: colors.line }]}
          >
            {row.poster ? (
              <Image source={{ uri: row.poster }} style={styles.matchPoster} />
            ) : (
              <View style={[styles.matchPoster, { backgroundColor: colors.line }]} />
            )}
            <View style={styles.matchInfo}>
              <AppText variant="section" numberOfLines={2}>
                {row.title}
              </AppText>
              <AppText variant="label" muted>
                {new Date(row.match.matched_at).toLocaleDateString()}
              </AppText>
            </View>
          </Pressable>
        ))
      )}

      <MatchCelebration
        match={celebration}
        onClose={() => setCelebration(null)}
        onOpenDetail={(match) =>
          router.push({
            pathname: '/title/[mediaType]/[id]',
            params: { mediaType: match.media_type, id: String(match.tmdb_id) },
          })
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: layout.screenPaddingXCompact,
    paddingBottom: space.xxxl,
    gap: layout.stackGap,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
    gap: space.md,
  },
  memberRow: { flexDirection: 'row', flexWrap: 'wrap', gap: layout.inlineGap },
  deckArea: { height: 560 },
  matchRow: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: space.xs + 2,
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'center',
  },
  matchInfo: { flex: 1, gap: space.xxs },
  matchPoster: { width: 48, height: 72, borderRadius: radii.sm },
});
