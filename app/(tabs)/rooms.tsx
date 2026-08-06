import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { useAuth } from '@/providers/AuthProvider';
import { useThemeColors } from '@/providers/PreferencesProvider';
import {
  createRoom,
  joinRoomByCode,
  listMyRooms,
  type PlatformStrategy,
  type Room,
} from '@/src/features/rooms/api';
import { AppIcon, AppText, Button, TabScreenHeader, TextField } from '@/src/ui';
import { radii } from '@/theme/radii';
import { layout, space } from '@/theme/spacing';

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
    <ScrollView
      contentContainerStyle={[styles.root, { backgroundColor: colors.bg }]}
    >
      <TabScreenHeader title={t('rooms.title')} />

      <View style={styles.joinRow}>
        <TextField
          value={inviteCode}
          onChangeText={(value) => setInviteCode(value.toUpperCase())}
          placeholder={t('rooms.inviteCode')}
          autoCapitalize="characters"
          style={styles.input}
        />
        <Button label={t('rooms.join')} onPress={() => void handleJoin()} style={styles.joinButton} />
      </View>

      <Button label={t('rooms.create')} variant="secondary" onPress={() => setModalOpen(true)} />

      {loading ? <ActivityIndicator color={colors.cta} /> : null}
      {error ? (
        <AppText color={colors.nope} variant="caption">
          {error}
        </AppText>
      ) : null}

      {rooms.map((room) => (
        <Pressable
          key={room.id}
          onPress={() => router.push({ pathname: '/room/[id]', params: { id: room.id } })}
          style={[styles.roomCard, { backgroundColor: colors.surface, borderColor: colors.line }]}
        >
          <View style={styles.flex}>
            <AppText variant="section">
              {t('rooms.roomName', { code: room.invite_code })}
            </AppText>
            <AppText variant="caption" muted>
              {t(`rooms.strategy.${room.platform_strategy}`)}
            </AppText>
          </View>
          <AppIcon name="chevronForward" size={18} color={colors.cta} />
        </Pressable>
      ))}

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: colors.scrim }]}>
          <View style={[styles.modal, { backgroundColor: colors.surface }]}>
            <AppText variant="title">{t('rooms.create')}</AppText>
            {STRATEGIES.map((item) => (
              <Pressable
                key={item}
                onPress={() => setStrategy(item)}
                style={[
                  styles.strategy,
                  {
                    borderColor: strategy === item ? colors.cta : colors.line,
                    backgroundColor: strategy === item ? colors.accentSoft : 'transparent',
                  },
                ]}
              >
                <AppText variant="caption" style={styles.strategyLabel}>
                  {t(`rooms.strategy.${item}`)}
                </AppText>
              </Pressable>
            ))}
            <View style={styles.modalActions}>
              <Button
                label={t('common.cancel')}
                variant="ghost"
                onPress={() => setModalOpen(false)}
                style={styles.flex}
              />
              <Button label={t('rooms.create')} onPress={() => void handleCreate()} style={styles.flex} />
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
    paddingHorizontal: layout.screenPaddingX,
    gap: space.sm,
    paddingBottom: space.xxxl,
  },
  joinRow: { flexDirection: 'row', gap: space.xs, alignItems: 'center' },
  input: { flex: 1 },
  joinButton: { minWidth: 96 },
  flex: { flex: 1 },
  roomCard: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  modal: {
    borderTopLeftRadius: radii.xl + 4,
    borderTopRightRadius: radii.xl + 4,
    padding: layout.screenPaddingX,
    gap: space.sm,
  },
  strategy: { borderWidth: 1.5, borderRadius: radii.md, padding: space.sm + 2 },
  strategyLabel: { fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: space.xs + 2, marginTop: space.xs },
});
