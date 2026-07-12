import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
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
};

function titleFor(item: MediaItem): string {
  return item.title ?? item.name ?? item.original_title ?? item.original_name ?? 'Untitled';
}

function yearFor(item: MediaItem): string | null {
  const value = item.release_date ?? item.first_air_date;
  return value ? value.slice(0, 4) : null;
}

export function SwipeDeck({
  cards,
  onSwipeLike,
  onSwipeNope,
  onSwipeSeen,
  onOpenDetail,
}: SwipeDeckProps) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const active = cards[0];
  const next = cards[1];
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const threshold = width * 0.24;

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
        translateY.value = withTiming(-900);
        runOnJS(completeSwipe)('seen');
        return;
      }

      if (event.translationX > threshold) {
        translateX.value = withTiming(900);
        runOnJS(completeSwipe)('like');
        return;
      }

      if (event.translationX < -threshold) {
        translateX.value = withTiming(-900);
        runOnJS(completeSwipe)('nope');
        return;
      }

      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    });

  const animatedCardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateX.value, [-width, 0, width], [-12, 0, 12], 'clamp');
    const borderColor = interpolateColor(
      Math.max(Math.abs(translateX.value), Math.abs(translateY.value)),
      [0, threshold],
      [colors.line, translateY.value < -threshold ? colors.seen : translateX.value > 0 ? colors.accent : colors.nope],
    );

    return {
      borderColor,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  }, [colors.accent, colors.line, colors.nope, colors.seen, threshold, width]);

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

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.card, { backgroundColor: colors.surface }, animatedCardStyle]}>
          <Pressable style={styles.pressable} onPress={() => onOpenDetail(active)}>
            <Poster item={active} />
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
