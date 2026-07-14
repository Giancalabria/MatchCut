import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/providers/AuthProvider';
import { useThemeColors } from '@/providers/PreferencesProvider';
import {
  createRoom,
  joinRoomByCode,
  listMyRooms,
  type PlatformStrategy,
  type Room,
} from '@/src/features/rooms/api';
import { AppIcon, AppText, Button } from '@/src/ui';
import { typography } from '@/theme/typography';

const STRATEGIES: PlatformStrategy[] = ['intersection', 'catalog_owner', 'union', 'full'];

export default function RoomsScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
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
      contentContainerStyle={[
        styles.root,
        { backgroundColor: colors.bg, paddingTop: Math.max(insets.top, 12) },
      ]}
    >
      <AppText variant="display">{t('rooms.title')}</AppText>

      <View style={styles.joinRow}>
        <TextInput
          value={inviteCode}
          onChangeText={(value) => setInviteCode(value.toUpperCase())}
          placeholder={t('rooms.inviteCode')}
          placeholderTextColor={colors.inkMuted}
          autoCapitalize="characters"
          style={[
            styles.input,
            {
              borderColor: colors.line,
              color: colors.ink,
              backgroundColor: colors.surface,
              fontFamily: typography.body,
            },
          ]}
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
          <View style={{ flex: 1 }}>
            <AppText style={{ fontFamily: typography.bodyBold, fontSize: 17 }}>
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
        <View style={styles.modalBackdrop}>
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
                <AppText style={{ fontFamily: typography.bodyBold, fontSize: 14 }}>
                  {t(`rooms.strategy.${item}`)}
                </AppText>
              </Pressable>
            ))}
            <View style={styles.modalActions}>
              <Button
                label={t('common.cancel')}
                variant="ghost"
                onPress={() => setModalOpen(false)}
                style={{ flex: 1 }}
              />
              <Button label={t('rooms.create')} onPress={() => void handleCreate()} style={{ flex: 1 }} />
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
    paddingHorizontal: 24,
    gap: 12,
    paddingBottom: 40,
  },
  joinRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  joinButton: { minWidth: 96 },
  roomCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 },
  strategy: { borderWidth: 1.5, borderRadius: 12, padding: 14 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
});
