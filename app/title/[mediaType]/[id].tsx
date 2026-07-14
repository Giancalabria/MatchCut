import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';

import { useAuth } from '@/providers/AuthProvider';
import { usePreferences, useThemeColors } from '@/providers/PreferencesProvider';
import { JustWatchAttribution } from '@/src/features/deck/JustWatchAttribution';
import { backdropUrl, posterUrl } from '@/src/features/tmdb/images';
import { getDetails, getProviders, getVideos } from '@/src/features/tmdb/client';
import type { MediaDetails, MediaType, MediaVideo, RegionWatchProviders } from '@/src/features/tmdb/types';
import { ScreenHeader } from '@/src/ui';
import { typography } from '@/theme/typography';

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
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error || !details) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={[styles.error, { color: colors.nope, fontFamily: typography.bodyBold }]}>
          {error ?? t('errors.generic')}
        </Text>
        <Pressable onPress={() => router.back()} style={[styles.button, { backgroundColor: colors.cta }]}>
          <Text style={[styles.buttonText, { fontFamily: typography.bodyBold, color: colors.onAccent }]}>{t('common.back')}</Text>
        </Pressable>
      </View>
    );
  }

  const flatrate = providers?.flatrate ?? [];
  const cast = details.credits?.cast.slice(0, 12) ?? [];
  const backdrop = backdropUrl(details.backdrop_path) ?? posterUrl(details.poster_path);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={styles.headerPad}>
        <ScreenHeader showSafeTop onBack={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
      {backdrop ? <Image source={{ uri: backdrop }} style={styles.backdrop} contentFit="cover" /> : null}

      <Text style={[styles.title, { color: colors.ink, fontFamily: typography.display }]}>
        {titleFor(details)}
      </Text>
      {(() => {
        const year = (details.release_date ?? details.first_air_date)?.slice(0, 4) ?? null;
        const rating =
          typeof details.vote_average === 'number' && details.vote_average > 0
            ? details.vote_average.toFixed(1)
            : null;
        const meta = [rating, year].filter(Boolean).join(' · ');
        return meta ? (
          <Text style={[styles.tagline, { color: colors.inkMuted, fontFamily: typography.bodyMedium }]}>
            {meta}
          </Text>
        ) : null;
      })()}
      {details.tagline ? (
        <Text style={[styles.tagline, { color: colors.inkMuted, fontFamily: typography.bodyMedium }]}>
          {details.tagline}
        </Text>
      ) : null}

      <View style={styles.chips}>
        {details.genres.map((genre) => (
          <View key={genre.id} style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <Text style={[styles.chipText, { color: colors.ink, fontFamily: typography.bodyMedium }]}>
              {genre.name}
            </Text>
          </View>
        ))}
      </View>

      <Text style={[styles.section, { color: colors.ink, fontFamily: typography.bodyBold }]}>
        {t('detail.synopsis')}
      </Text>
      <Text style={[styles.overview, { color: colors.inkMuted, fontFamily: typography.body }]}>
        {details.overview || t('detail.noSynopsis')}
      </Text>

      {key ? (
        <>
          <Text style={[styles.section, { color: colors.ink, fontFamily: typography.bodyBold }]}>
            {t('detail.trailer')}
          </Text>
          <View style={styles.video}>
            <YoutubePlayer height={210} videoId={key} />
          </View>
        </>
      ) : null}

      <Text style={[styles.section, { color: colors.ink, fontFamily: typography.bodyBold }]}>
        {t('detail.providers')}
      </Text>
      {flatrate.length > 0 ? (
        <View style={styles.chips}>
          {flatrate.map((provider) => (
            <View key={provider.provider_id} style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <Text style={[styles.chipText, { color: colors.ink, fontFamily: typography.bodyMedium }]}>
                {provider.provider_name}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[styles.overview, { color: colors.inkMuted, fontFamily: typography.body }]}>
          {t('detail.noProviders')}
        </Text>
      )}
      <JustWatchAttribution link={providers?.link} />

      {cast.length > 0 ? (
        <>
          <Text style={[styles.section, { color: colors.ink, fontFamily: typography.bodyBold }]}>
            {t('detail.cast')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.castRow}>
            {cast.map((member) => (
              <View key={`${member.id}-${member.character}`} style={[styles.castCard, { backgroundColor: colors.surface }]}>
                <Image source={{ uri: posterUrl(member.profile_path, 'w185') ?? undefined }} style={styles.castImage} contentFit="cover" />
                <Text style={[styles.castName, { color: colors.ink, fontFamily: typography.bodyBold }]} numberOfLines={2}>
                  {member.name}
                </Text>
                <Text style={[styles.castRole, { color: colors.inkMuted, fontFamily: typography.body }]} numberOfLines={2}>
                  {member.character}
                </Text>
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
  headerPad: { paddingHorizontal: 16 },
  content: { padding: 20, paddingBottom: 40, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  backdrop: { height: 220, borderRadius: 24, overflow: 'hidden' },
  title: { fontSize: 32 },
  tagline: { fontSize: 15, lineHeight: 21 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { fontSize: 13 },
  section: { fontSize: 19, marginTop: 10 },
  overview: { fontSize: 15, lineHeight: 22 },
  video: { borderRadius: 18, overflow: 'hidden' },
  castRow: { gap: 10, paddingVertical: 4 },
  castCard: { width: 112, borderRadius: 16, padding: 8, gap: 5 },
  castImage: { height: 128, borderRadius: 12, backgroundColor: '#D4DDE6' },
  castName: { fontSize: 13 },
  castRole: { fontSize: 12 },
  error: { fontSize: 16, textAlign: 'center' },
  button: { borderRadius: 999, paddingHorizontal: 18, paddingVertical: 11 },
  buttonText: { fontSize: 14 },
});
