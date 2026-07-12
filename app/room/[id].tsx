import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/providers/AuthProvider';
import { useThemeColors } from '@/providers/PreferencesProvider';
import { buildFeed } from '@/src/features/deck/buildFeed';
import { SwipeDeck } from '@/src/features/deck/SwipeDeck';
import {
  castRoomVote,
  getRoom,
  listMatches,
  listRoomMembers,
  setCatalogOwner,
  type Room,
  type RoomMatch,
  type RoomMember,
} from '@/src/features/rooms/api';
import type { MediaItem, MediaType } from '@/src/features/tmdb/types';
import { typography } from '@/theme/typography';

function resolveMediaType(item: MediaItem): MediaType {
  return item.media_type === 'tv' ? 'tv' : 'movie';
}

export default function RoomScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { profile } = useAuth();
  const params = useLocalSearchParams();
  const roomId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [matches, setMatches] = useState<RoomMatch[]>([]);
  const [cards, setCards] = useState<MediaItem[]>([]);
  const [celebration, setCelebration] = useState<RoomMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRoom = useCallback(async () => {
    if (!roomId || !profile) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [nextRoom, nextMembers, nextMatches, nextCards] = await Promise.all([
        getRoom(roomId),
        listRoomMembers(roomId),
        listMatches(roomId),
        buildFeed(profile, []),
      ]);
      setRoom(nextRoom);
      setMembers(nextMembers);
      setMatches(nextMatches);
      setCards(nextCards);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  }, [profile, roomId, t]);

  useEffect(() => {
    void loadRoom();
  }, [loadRoom]);

  async function vote(item: MediaItem, voteValue: 'yes' | 'no' | 'seen') {
    if (!roomId) {
      return;
    }

    const before = matches.length;
    setCards((current) => current.filter((card) => card.id !== item.id || resolveMediaType(card) !== resolveMediaType(item)));
    await castRoomVote(roomId, item.id, resolveMediaType(item), voteValue);
    const nextMatches = await listMatches(roomId);
    setMatches(nextMatches);
    if (nextMatches.length > before) {
      setCelebration(nextMatches[0] ?? null);
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
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error || !room) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={[styles.error, { color: colors.nope, fontFamily: typography.bodyBold }]}>
          {error ?? t('rooms.notFound')}
        </Text>
        <Pressable onPress={() => router.back()} style={[styles.primary, { backgroundColor: colors.accent }]}>
          <Text style={[styles.primaryText, { fontFamily: typography.bodyBold }]}>{t('common.back')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.root, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={[styles.backText, { color: colors.accent, fontFamily: typography.bodyBold }]}>
          {t('common.back')}
        </Text>
      </Pressable>
      <Text style={[styles.title, { color: colors.ink, fontFamily: typography.display }]}>
        {t('rooms.roomName', { code: room.invite_code })}
      </Text>
      <Text style={[styles.body, { color: colors.inkMuted, fontFamily: typography.body }]}>
        {t(`rooms.strategy.${room.platform_strategy}`)}
      </Text>

      <Text style={[styles.section, { color: colors.ink, fontFamily: typography.bodyBold }]}>
        {t('rooms.catalogOwner')}
      </Text>
      <View style={styles.memberRow}>
        {members.map((member) => (
          <Pressable
            key={member.user_id}
            onPress={() => {
              void handleSetCatalogOwner(member.user_id);
            }}
            style={[
              styles.memberChip,
              {
                borderColor: room.catalog_owner_id === member.user_id ? colors.accent : colors.line,
                backgroundColor: colors.surface,
              },
            ]}
          >
            <Text style={[styles.memberText, { color: colors.ink, fontFamily: typography.bodyMedium }]}>
              {member.role === 'host' ? t('rooms.host') : t('rooms.member')} · {member.user_id.slice(0, 6)}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.deckArea}>
        {cards.length > 0 ? (
          <SwipeDeck
            cards={cards}
            onOpenDetail={(item) => router.push({
              pathname: '/title/[mediaType]/[id]',
              params: { mediaType: resolveMediaType(item), id: String(item.id) },
            })}
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
          <Text style={[styles.body, { color: colors.inkMuted, fontFamily: typography.body }]}>
            {t('rooms.emptyDeck')}
          </Text>
        )}
      </View>

      <Text style={[styles.section, { color: colors.ink, fontFamily: typography.bodyBold }]}>
        {t('rooms.matches')}
      </Text>
      {matches.length === 0 ? (
        <Text style={[styles.body, { color: colors.inkMuted, fontFamily: typography.body }]}>
          {t('rooms.noMatches')}
        </Text>
      ) : (
        matches.map((match) => (
          <Pressable
            key={match.id}
            onPress={() => router.push({
              pathname: '/title/[mediaType]/[id]',
              params: { mediaType: match.media_type, id: String(match.tmdb_id) },
            })}
            style={[styles.matchRow, { backgroundColor: colors.surface, borderColor: colors.line }]}
          >
            <Text style={[styles.matchText, { color: colors.ink, fontFamily: typography.bodyBold }]}>
              {match.media_type.toUpperCase()} #{match.tmdb_id}
            </Text>
            <Text style={[styles.matchDate, { color: colors.inkMuted, fontFamily: typography.body }]}>
              {new Date(match.matched_at).toLocaleDateString()}
            </Text>
          </Pressable>
        ))
      )}

      <Modal visible={celebration !== null} transparent animationType="fade" onRequestClose={() => setCelebration(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.match, fontFamily: typography.display }]}>
              {t('match.title')}
            </Text>
            <Text style={[styles.body, { color: colors.inkMuted, fontFamily: typography.body, textAlign: 'center' }]}>
              {t('match.body')}
            </Text>
            <Pressable onPress={() => setCelebration(null)} style={[styles.primary, { backgroundColor: colors.match }]}>
              <Text style={[styles.primaryText, { fontFamily: typography.bodyBold }]}>{t('common.continue')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  back: { alignSelf: 'flex-start', paddingVertical: 8 },
  backText: { fontSize: 15 },
  title: { fontSize: 30 },
  body: { fontSize: 15, lineHeight: 21 },
  section: { fontSize: 18, marginTop: 8 },
  memberRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  memberChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  memberText: { fontSize: 12 },
  deckArea: { height: 560 },
  matchRow: { borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: 'row', justifyContent: 'space-between' },
  matchText: { fontSize: 14 },
  matchDate: { fontSize: 12 },
  error: { fontSize: 15, textAlign: 'center' },
  primary: { borderRadius: 999, paddingHorizontal: 18, paddingVertical: 11, alignItems: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 14 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modal: { borderRadius: 28, padding: 24, gap: 12, alignItems: 'center' },
  modalTitle: { fontSize: 32 },
});
