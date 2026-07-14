import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useThemeColors } from '@/providers/PreferencesProvider';
import { posterUrl } from '@/src/features/tmdb/images';
import type { MediaItem } from '@/src/features/tmdb/types';
import { typography } from '@/theme/typography';

type SwipeDirection = 'like' | 'nope' | 'seen';

type SwipeDeckProps = {
  cards: MediaItem[];
  onSwipeLike: (item: MediaItem) => void;
  onSwipeNope: (item: MediaItem) => void;
  onSwipeSeen: (item: MediaItem) => void;
  onOpenDetail: (item: MediaItem) => void;
  stampLabels?: {
    like?: string;
    nope?: string;
    seen?: string;
  };
};

function titleFor(item: MediaItem): string {
  return item.title ?? item.name ?? item.original_title ?? item.original_name ?? 'Untitled';
}

function yearFor(item: MediaItem): string | null {
  const value = item.release_date ?? item.first_air_date;
  return value ? value.slice(0, 4) : null;
}

function cardKey(item: MediaItem): string {
  const mediaType = item.media_type === 'tv' ? 'tv' : 'movie';
  return `${mediaType}:${item.id}`;
}

export function SwipeDeck({
  cards,
  onSwipeLike,
  onSwipeNope,
  onSwipeSeen,
  onOpenDetail,
  stampLabels,
}: SwipeDeckProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const likeLabel = stampLabels?.like ?? t('explore.stampLike');
  const nopeLabel = stampLabels?.nope ?? t('explore.stampNope');
  const seenLabel = stampLabels?.seen ?? t('explore.stampSeen');
  const { width } = useWindowDimensions();
  const active = cards[0];
  const next = cards[1];
  const activeKey = active ? cardKey(active) : null;
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const exitOpacity = useSharedValue(1);
  const threshold = width * 0.24;

  useEffect(() => {
    cancelAnimation(translateX);
    cancelAnimation(translateY);
    cancelAnimation(exitOpacity);
    translateX.value = 0;
    translateY.value = 0;
    exitOpacity.value = 1;
  }, [activeKey, translateX, translateY, exitOpacity]);

  const completeSwipe = (direction: SwipeDirection) => {
    if (!active) {
      return;
    }

    if (direction === 'like') {
      onSwipeLike(active);
    } else if (direction === 'nope') {
      onSwipeNope(active);
    } else {
      onSwipeSeen(active);
    }
  };

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationY < -threshold) {
        exitOpacity.value = withTiming(0.35, { duration: 220 });
        translateY.value = withTiming(-900, { duration: 220 }, (finished) => {
          if (finished) {
            runOnJS(completeSwipe)('seen');
          }
        });
        return;
      }

      if (event.translationX > threshold) {
        exitOpacity.value = withTiming(0.35, { duration: 220 });
        translateX.value = withTiming(900, { duration: 220 }, (finished) => {
          if (finished) {
            runOnJS(completeSwipe)('like');
          }
        });
        return;
      }

      if (event.translationX < -threshold) {
        exitOpacity.value = withTiming(0.35, { duration: 220 });
        translateX.value = withTiming(-900, { duration: 220 }, (finished) => {
          if (finished) {
            runOnJS(completeSwipe)('nope');
          }
        });
        return;
      }

      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    });

  const animatedCardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateX.value, [-width, 0, width], [-16, 0, 16], 'clamp');
    const borderColor = interpolateColor(
      Math.max(Math.abs(translateX.value), Math.abs(translateY.value)),
      [0, threshold],
      [colors.line, translateY.value < -threshold ? colors.seen : translateX.value > 0 ? colors.accent : colors.nope],
    );

    return {
      borderColor,
      opacity: exitOpacity.value,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  }, [colors.accent, colors.line, colors.nope, colors.seen, threshold, width]);

  const likeStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [threshold * 0.15, threshold], [0, 1], 'clamp'),
  }));
  const nopeStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-threshold, -threshold * 0.15], [1, 0], 'clamp'),
  }));
  const seenStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [-threshold, -threshold * 0.15], [1, 0], 'clamp'),
  }));

  if (!active) {
    return null;
  }

  return (
    <View style={styles.deck}>
      {next ? (
        <View style={[styles.card, styles.nextCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Poster item={next} muted />
        </View>
      ) : null}

      <GestureDetector gesture={pan} key={activeKey ?? 'empty'}>
        <Animated.View style={[styles.card, { backgroundColor: colors.surface }, animatedCardStyle]}>
          <Pressable style={styles.pressable} onPress={() => onOpenDetail(active)}>
            <Poster item={active} />
            <Animated.View
              style={[
                styles.stamp,
                styles.stampLike,
                { borderColor: colors.accent, backgroundColor: 'rgba(0, 168, 150, 0.88)' },
                likeStampStyle,
              ]}
            >
              <Text style={[styles.stampText, { color: '#FFFFFF', fontFamily: typography.bodyBold }]}>
                {likeLabel}
              </Text>
            </Animated.View>
            <Animated.View
              style={[
                styles.stamp,
                styles.stampNope,
                { borderColor: colors.nope, backgroundColor: 'rgba(228, 87, 76, 0.88)' },
                nopeStampStyle,
              ]}
            >
              <Text style={[styles.stampText, { color: '#FFFFFF', fontFamily: typography.bodyBold }]}>
                {nopeLabel}
              </Text>
            </Animated.View>
            <Animated.View
              style={[
                styles.stamp,
                styles.stampSeen,
                { borderColor: colors.seen, backgroundColor: 'rgba(232, 163, 23, 0.9)' },
                seenStampStyle,
              ]}
            >
              <Text style={[styles.stampText, { color: '#1A1A1A', fontFamily: typography.bodyBold }]}>
                {seenLabel}
              </Text>
            </Animated.View>
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.82)']} style={styles.caption}>
              <Text style={[styles.title, { fontFamily: typography.display }]} numberOfLines={2}>
                {titleFor(active)}
              </Text>
              <Text style={[styles.meta, { fontFamily: typography.bodyMedium }]} numberOfLines={2}>
                {[yearFor(active), active.vote_average ? active.vote_average.toFixed(1) : null]
                  .filter(Boolean)
                  .join(' • ')}
              </Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function Poster({ item, muted = false }: { item: MediaItem; muted?: boolean }) {
  const colors = useThemeColors();
  const uri = posterUrl(item.poster_path);

  return (
    <View style={[styles.posterFallback, { backgroundColor: colors.line }]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.poster, muted ? styles.mutedPoster : null]}
          contentFit="cover"
          transition={180}
        />
      ) : (
        <Text style={{ color: colors.inkMuted, fontFamily: typography.bodyMedium, textAlign: 'center' }}>
          {titleFor(item)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  deck: {
    flex: 1,
    minHeight: 520,
    justifyContent: 'center',
  },
  card: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 28,
    borderWidth: 3,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 5,
  },
  nextCard: {
    transform: [{ scale: 0.94 }, { translateY: 18 }],
    opacity: 0.7,
  },
  pressable: {
    flex: 1,
  },
  posterFallback: {
    flex: 1,
    minHeight: '80%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  mutedPoster: {
    opacity: 0.8,
  },
  stamp: {
    position: 'absolute',
    borderWidth: 4,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  stampLike: {
    top: 28,
    left: 18,
    transform: [{ rotate: '-12deg' }],
  },
  stampNope: {
    top: 28,
    right: 18,
    transform: [{ rotate: '12deg' }],
  },
  stampSeen: {
    top: 28,
    alignSelf: 'center',
    left: '28%',
  },
  stampText: {
    fontSize: 30,
    letterSpacing: 1.5,
  },
  caption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 22,
    paddingTop: 80,
    gap: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
  },
  meta: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
  },
});
