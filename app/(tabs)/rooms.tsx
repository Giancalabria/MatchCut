import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/providers/AuthProvider';
import { useThemeColors } from '@/providers/PreferencesProvider';
import {
  createRoom,
  joinRoomByCode,
  listMyRooms,
  type PlatformStrategy,
  type Room,
} from '@/src/features/rooms/api';
import { typography } from '@/theme/typography';

const STRATEGIES: PlatformStrategy[] = ['intersection', 'catalog_owner', 'union', 'full'];

export default function RoomsScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { isConfigured } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [strategy, setStrategy] = useState<PlatformStrategy>('intersection');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function loadRooms() {
    if (!isConfigured) {
      setRooms([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setRooms(await listMyRooms());
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRooms();
  }, [isConfigured]);

  async function handleCreate() {
    setLoading(true);
    try {
      const room = await createRoom(strategy);
      setModalOpen(false);
      await loadRooms();
      router.push({ pathname: '/room/[id]', params: { id: room.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!inviteCode.trim()) {
      return;
    }

    setLoading(true);
    try {
      const room = await joinRoomByCode(inviteCode);
      setInviteCode('');
      await loadRooms();
      router.push({ pathname: '/room/[id]', params: { id: room.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={[styles.root, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.ink, fontFamily: typography.display }]}>
        {t('rooms.title')}
      </Text>
      <Text style={[styles.body, { color: colors.inkMuted, fontFamily: typography.body }]}>
        {t('rooms.subtitle')}
      </Text>

      <View style={styles.joinRow}>
        <TextInput
          value={inviteCode}
          onChangeText={(value) => setInviteCode(value.toUpperCase())}
          placeholder={t('rooms.inviteCode')}
          placeholderTextColor={colors.inkMuted}
          autoCapitalize="characters"
          style={[styles.input, { borderColor: colors.line, color: colors.ink, backgroundColor: colors.surface, fontFamily: typography.body }]}
        />
        <Pressable onPress={handleJoin} style={[styles.primaryButton, { backgroundColor: colors.accent }]}>
          <Text style={[styles.primaryText, { fontFamily: typography.bodyBold }]}>{t('rooms.join')}</Text>
        </Pressable>
      </View>

      <Pressable onPress={() => setModalOpen(true)} style={[styles.createButton, { borderColor: colors.accent }]}>
        <Text style={[styles.createText, { color: colors.accent, fontFamily: typography.bodyBold }]}>
          {t('rooms.create')}
        </Text>
      </Pressable>

      {loading ? <ActivityIndicator color={colors.accent} /> : null}
      {error ? <Text style={[styles.error, { color: colors.nope, fontFamily: typography.body }]}>{error}</Text> : null}

      {rooms.map((room) => (
        <Pressable
          key={room.id}
          onPress={() => router.push({ pathname: '/room/[id]', params: { id: room.id } })}
          style={[styles.roomCard, { backgroundColor: colors.surface, borderColor: colors.line }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.roomTitle, { color: colors.ink, fontFamily: typography.bodyBold }]}>
              {t('rooms.roomName', { code: room.invite_code })}
            </Text>
            <Text style={[styles.roomMeta, { color: colors.inkMuted, fontFamily: typography.body }]}>
              {t(`rooms.strategy.${room.platform_strategy}`)}
            </Text>
          </View>
          <Text style={{ color: colors.accent, fontFamily: typography.bodyBold }}>›</Text>
        </Pressable>
      ))}

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.ink, fontFamily: typography.display }]}>
              {t('rooms.create')}
            </Text>
            {STRATEGIES.map((item) => (
              <Pressable
                key={item}
                onPress={() => setStrategy(item)}
                style={[styles.strategy, { borderColor: strategy === item ? colors.accent : colors.line }]}
              >
                <Text style={[styles.strategyText, { color: colors.ink, fontFamily: typography.bodyBold }]}>
                  {t(`rooms.strategy.${item}`)}
                </Text>
              </Pressable>
            ))}
            <View style={styles.modalActions}>
              <Pressable onPress={() => setModalOpen(false)} style={styles.modalAction}>
                <Text style={[styles.modalActionText, { color: colors.inkMuted, fontFamily: typography.bodyBold }]}>
                  {t('common.cancel')}
                </Text>
              </Pressable>
              <Pressable onPress={handleCreate} style={[styles.modalAction, { backgroundColor: colors.accent }]}>
                <Text style={[styles.primaryText, { fontFamily: typography.bodyBold }]}>{t('rooms.create')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    padding: 24,
    gap: 12,
  },
  title: { fontSize: 28 },
  body: { fontSize: 16, lineHeight: 22 },
  joinRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  primaryButton: { borderRadius: 14, paddingHorizontal: 16, justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 14 },
  createButton: { borderWidth: 1.5, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  createText: { fontSize: 15 },
  error: { fontSize: 14 },
  roomCard: { borderWidth: 1, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  roomTitle: { fontSize: 17 },
  roomMeta: { fontSize: 13, marginTop: 3 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 12 },
  modalTitle: { fontSize: 24 },
  strategy: { borderWidth: 1.5, borderRadius: 14, padding: 14 },
  strategyText: { fontSize: 14 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalAction: { flex: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  modalActionText: { fontSize: 14 },
});
