import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';

import { useAuth } from '@/providers/AuthProvider';
import { usePreferences, useThemeColors } from '@/providers/PreferencesProvider';
import { JustWatchAttribution } from '@/src/features/deck/JustWatchAttribution';
import { backdropUrl, posterUrl } from '@/src/features/tmdb/images';
import { getDetails, getProviders, getVideos } from '@/src/features/tmdb/client';
import type { MediaDetails, MediaType, MediaVideo, RegionWatchProviders } from '@/src/features/tmdb/types';
import { AppText, Button, ScreenHeader } from '@/src/ui';
import { radii } from '@/theme/radii';
import { layout, space } from '@/theme/spacing';

function isMediaType(value: unknown): value is MediaType {
  return value === 'movie' || value === 'tv';
}

function titleFor(details: MediaDetails): string {
  return details.title ?? details.name ?? details.original_title ?? details.original_name ?? '';
}

function trailerKey(videos: MediaVideo[]): string | null {
  return (
    videos.find((video) => video.site === 'YouTube' && video.type === 'Trailer' && video.official)?.key ??
    videos.find((video) => video.site === 'YouTube' && video.type === 'Trailer')?.key ??
    videos.find((video) => video.site === 'YouTube')?.key ??
    null
  );
}

export default function TitleDetailScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { language } = usePreferences();
  const { profile } = useAuth();
  const params = useLocalSearchParams();
  const mediaType = isMediaType(params.mediaType) ? params.mediaType : 'movie';
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [providers, setProviders] = useState<RegionWatchProviders | null>(null);
  const [videos, setVideos] = useState<MediaVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError(t('errors.missingTitle'));
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      getDetails(mediaType, id, language === 'en' ? 'en-US' : 'es-ES'),
      getProviders(mediaType, id, profile?.region ?? undefined),
      getVideos(mediaType, id, language === 'en' ? 'en-US' : 'es-ES'),
    ])
      .then(([nextDetails, nextProviders, nextVideos]) => {
        if (cancelled) {
          return;
        }
        setDetails(nextDetails);
        setProviders(nextProviders);
        setVideos(nextVideos);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : t('errors.generic'));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, language, mediaType, profile?.region, t]);

  const key = useMemo(() => trailerKey(videos), [videos]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.cta} />
      </View>
    );
  }

  if (error || !details) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <AppText color={colors.nope} style={styles.centerText}>
          {error ?? t('errors.generic')}
        </AppText>
        <Button label={t('common.back')} onPress={() => router.back()} />
      </View>
    );
  }

  const flatrate = providers?.flatrate ?? [];
  const cast = details.credits?.cast.slice(0, 12) ?? [];
  const backdrop = backdropUrl(details.backdrop_path) ?? posterUrl(details.poster_path);
  const year = (details.release_date ?? details.first_air_date)?.slice(0, 4) ?? null;
  const rating =
    typeof details.vote_average === 'number' && details.vote_average > 0
      ? details.vote_average.toFixed(1)
      : null;
  const meta = [rating, year].filter(Boolean).join(' · ');

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={styles.headerPad}>
        <ScreenHeader showSafeTop onBack={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {backdrop ? <Image source={{ uri: backdrop }} style={styles.backdrop} contentFit="cover" /> : null}

        <AppText variant="hero">{titleFor(details)}</AppText>
        {meta ? <AppText muted>{meta}</AppText> : null}
        {details.tagline ? <AppText muted>{details.tagline}</AppText> : null}

        <View style={styles.chips}>
          {details.genres.map((genre) => (
            <View
              key={genre.id}
              style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.line }]}
            >
              <AppText variant="caption">{genre.name}</AppText>
            </View>
          ))}
        </View>

        <AppText variant="section" style={styles.section}>
          {t('detail.synopsis')}
        </AppText>
        <AppText muted>{details.overview || t('detail.noSynopsis')}</AppText>

        {key ? (
          <>
            <AppText variant="section" style={styles.section}>
              {t('detail.trailer')}
            </AppText>
            <View style={styles.video}>
              <YoutubePlayer height={210} videoId={key} />
            </View>
          </>
        ) : null}

        <AppText variant="section" style={styles.section}>
          {t('detail.providers')}
        </AppText>
        {flatrate.length > 0 ? (
          <View style={styles.chips}>
            {flatrate.map((provider) => (
              <View
                key={provider.provider_id}
                style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.line }]}
              >
                <AppText variant="caption">{provider.provider_name}</AppText>
              </View>
            ))}
          </View>
        ) : (
          <AppText muted>{t('detail.noProviders')}</AppText>
        )}
        <JustWatchAttribution link={providers?.link} />

        {cast.length > 0 ? (
          <>
            <AppText variant="section" style={styles.section}>
              {t('detail.cast')}
            </AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.castRow}>
              {cast.map((member) => (
                <View
                  key={`${member.id}-${member.character}`}
                  style={[styles.castCard, { backgroundColor: colors.surface }]}
                >
                  <Image
                    source={{ uri: posterUrl(member.profile_path, 'w185') ?? undefined }}
                    style={[styles.castImage, { backgroundColor: colors.line }]}
                    contentFit="cover"
                  />
                  <AppText variant="caption" numberOfLines={2}>
                    {member.name}
                  </AppText>
                  <AppText variant="label" muted numberOfLines={2}>
                    {member.character}
                  </AppText>
                </View>
              ))}
            </ScrollView>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerPad: { paddingHorizontal: space.md },
  content: {
    padding: layout.screenPaddingXCompact,
    paddingBottom: space.xxxl,
    gap: space.sm,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: layout.screenPaddingX,
    gap: space.md,
  },
  centerText: { textAlign: 'center' },
  backdrop: { height: 220, borderRadius: radii.xl + 4, overflow: 'hidden' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  chip: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
  section: { marginTop: space.xs + 2 },
  video: { borderRadius: radii.lg + 2, overflow: 'hidden' },
  castRow: { gap: space.xs + 2, paddingVertical: space.xxs },
  castCard: { width: 112, borderRadius: radii.lg, padding: space.xs, gap: 5 },
  castImage: { height: 128, borderRadius: radii.md },
});
