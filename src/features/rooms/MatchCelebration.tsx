import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useThemeColors } from '@/providers/PreferencesProvider';
import type { RoomMatch } from '@/src/features/rooms/api';
import { getDetails } from '@/src/features/tmdb/client';
import { posterUrl } from '@/src/features/tmdb/images';
import { AppText, Button } from '@/src/ui';
import { space } from '@/theme/spacing';

type MatchCelebrationProps = {
  match: RoomMatch | null;
  onClose: () => void;
  onOpenDetail: (match: RoomMatch) => void;
};

export function MatchCelebration({ match, onClose, onOpenDetail }: MatchCelebrationProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [title, setTitle] = useState<string | null>(null);
  const [poster, setPoster] = useState<string | null>(null);
  const cutOpacity = useSharedValue(1);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    if (!match) {
      setTitle(null);
      setPoster(null);
      cutOpacity.value = 1;
      contentOpacity.value = 0;
      return;
    }

    let cancelled = false;
    cutOpacity.value = 1;
    contentOpacity.value = 0;

    void getDetails(match.media_type, match.tmdb_id).then((details) => {
      if (cancelled) return;
      setTitle(
        details?.title ??
          details?.name ??
          details?.original_title ??
          details?.original_name ??
          null,
      );
      setPoster(posterUrl(details?.poster_path, 'w780'));
    });

    const timer = setTimeout(() => {
      cutOpacity.value = withTiming(0, { duration: 160 });
      contentOpacity.value = withDelay(80, withTiming(1, { duration: 280 }));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 110);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [match, cutOpacity, contentOpacity]);

  const cutStyle = useAnimatedStyle(() => ({ opacity: cutOpacity.value }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));

  return (
    <Modal
      visible={match !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <Animated.View style={[styles.content, contentStyle]}>
          {poster ? (
            <Image source={{ uri: poster }} style={[StyleSheet.absoluteFill, styles.poster]} contentFit="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.poster, { backgroundColor: colors.surface }]} />
          )}
          <LinearGradient colors={['transparent', colors.posterScrim]} style={styles.gradient}>
            <View style={[styles.matchEdge, { borderColor: colors.match }]}>
              <AppText variant="display" color={colors.onPoster} style={styles.matchTitle}>
                {t('match.title')}
              </AppText>
            </View>
            {title ? (
              <AppText variant="title" color={colors.onPoster} style={styles.title} numberOfLines={2}>
                {title}
              </AppText>
            ) : null}
            <AppText muted color={colors.onPosterMuted} style={styles.body}>
              {t('match.body')}
            </AppText>
            <View style={styles.actions}>
              <Button
                label={t('match.keepSwiping')}
                variant="secondary"
                onPress={onClose}
                style={styles.action}
              />
              <Button
                label={t('match.viewTitle')}
                onPress={() => {
                  if (match) {
                    onOpenDetail(match);
                  }
                  onClose();
                }}
                style={styles.action}
              />
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.cutWipe }, cutStyle]}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
  poster: {},
  gradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: space.xl,
    paddingBottom: space.xxxl,
    gap: space.xs + 2,
  },
  matchEdge: {
    alignSelf: 'flex-start',
    borderLeftWidth: 3,
    paddingLeft: space.sm,
  },
  matchTitle: { fontSize: 34, lineHeight: 40 },
  title: { marginTop: space.xxs },
  body: { marginBottom: space.xs },
  actions: { flexDirection: 'row', gap: space.xs + 2, marginTop: space.xs },
  action: { flex: 1 },
});