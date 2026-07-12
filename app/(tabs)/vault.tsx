import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/providers/AuthProvider';
import { usePreferences, useThemeColors } from '@/providers/PreferencesProvider';
import type { AppLanguage } from '@/i18n';
import {
  listByAction,
  restoreNope,
  setRating,
  upsertInteraction,
  type TitleInteraction,
} from '@/src/features/interactions/api';
import { TitleCollection } from '@/src/features/vault/TitleCollection';
import type { ThemeMode } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Segment = 'watchlist' | 'discards' | 'diary';

function OptionRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.option,
        {
          backgroundColor: colors.surface,
          borderColor: selected ? colors.accent : colors.line,
        },
      ]}
    >
      <Text
        style={{
          color: colors.ink,
          fontFamily: selected ? typography.bodyBold : typography.body,
          fontSize: 15,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function LinkRow({ label, detail, onPress }: { label: string; detail?: string; onPress: () => void }) {
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      style={[styles.linkRow, { backgroundColor: colors.surface, borderColor: colors.line }]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: colors.ink, fontFamily: typography.bodyMedium, fontSize: 15 }}>
          {label}
        </Text>
        {detail ? (
          <Text style={{ color: colors.inkMuted, fontFamily: typography.body, fontSize: 13 }}>
            {detail}
          </Text>
        ) : null}
      </View>
      <Text style={{ color: colors.accent, fontFamily: typography.bodyBold }}>›</Text>
    </Pressable>
  );
}

export default function VaultScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { language, setLanguage, themeMode, setThemeMode } = usePreferences();
  const { user, profile, isConfigured, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [segment, setSegment] = useState<Segment>('watchlist');
  const [likes, setLikes] = useState<TitleInteraction[]>([]);
  const [nopes, setNopes] = useState<TitleInteraction[]>([]);
  const [seens, setSeens] = useState<TitleInteraction[]>([]);
  const [loadingVault, setLoadingVault] = useState(false);

  const languages: { id: AppLanguage; label: string }[] = [
    { id: 'es', label: t('settings.languageEs') },
    { id: 'en', label: t('settings.languageEn') },
  ];

  const themes: { id: ThemeMode; label: string }[] = [
    { id: 'light', label: t('settings.themeLight') },
    { id: 'dark', label: t('settings.themeDark') },
    { id: 'system', label: t('settings.themeSystem') },
  ];

  const regionLabel = profile?.region
    ? t(`regions.${profile.region}` as 'regions.AR')
    : '—';

  const sortedDiary = useMemo(
    () => [...seens].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)),
    [seens],
  );

  async function loadVault() {
    if (!isConfigured) {
      setLikes([]);
      setNopes([]);
      setSeens([]);
      return;
    }

    setLoadingVault(true);
    try {
      const [nextLikes, nextNopes, nextSeens] = await Promise.all([
        listByAction('like'),
        listByAction('nope'),
        listByAction('seen'),
      ]);
      setLikes(nextLikes);
      setNopes(nextNopes);
      setSeens(nextSeens);
    } finally {
      setLoadingVault(false);
    }
  }

  useEffect(() => {
    void loadVault();
  }, [isConfigured]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.replace(isConfigured ? '/(auth)/login' : '/(tabs)/explore');
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={[styles.root, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.ink, fontFamily: typography.display }]}>
        {t('vault.title')}
      </Text>
      <Text style={[styles.body, { color: colors.inkMuted, fontFamily: typography.body }]}>
        {t('vault.subtitle')}
      </Text>

      <View style={[styles.segmentRow, { backgroundColor: colors.surface }]}>
        {(['watchlist', 'discards', 'diary'] as Segment[]).map((item) => (
          <Pressable
            key={item}
            onPress={() => setSegment(item)}
            style={[
              styles.segmentButton,
              { backgroundColor: segment === item ? colors.accent : 'transparent' },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color: segment === item ? '#FFFFFF' : colors.inkMuted,
                  fontFamily: typography.bodyBold,
                },
              ]}
            >
              {t(`vault.segments.${item}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {loadingVault ? <ActivityIndicator color={colors.accent} /> : null}

      {segment === 'watchlist' ? (
        <TitleCollection
          interactions={likes}
          actions={{
            onOpen: (interaction) => router.push({
              pathname: '/title/[mediaType]/[id]',
              params: { mediaType: interaction.media_type, id: String(interaction.tmdb_id) },
            }),
            onRate: (interaction, rating) => {
              void setRating(interaction.tmdb_id, interaction.media_type, rating).then(loadVault);
            },
          }}
        />
      ) : null}

      {segment === 'discards' ? (
        <TitleCollection
          interactions={nopes}
          actions={{
            onOpen: (interaction) => router.push({
              pathname: '/title/[mediaType]/[id]',
              params: { mediaType: interaction.media_type, id: String(interaction.tmdb_id) },
            }),
            onRestore: (interaction) => {
              void restoreNope(interaction.tmdb_id, interaction.media_type).then(loadVault);
            },
            onMoveToWatchlist: (interaction) => {
              void upsertInteraction({
                tmdb_id: interaction.tmdb_id,
                media_type: interaction.media_type,
                action: 'like',
              }).then(loadVault);
            },
          }}
        />
      ) : null}

      {segment === 'diary' ? (
        <TitleCollection
          interactions={sortedDiary}
          showRatingButtons
          actions={{
            onOpen: (interaction) => router.push({
              pathname: '/title/[mediaType]/[id]',
              params: { mediaType: interaction.media_type, id: String(interaction.tmdb_id) },
            }),
            onRate: (interaction, rating) => {
              void setRating(interaction.tmdb_id, interaction.media_type, rating).then(loadVault);
            },
          }}
        />
      ) : null}

      {user?.email ? (
        <Text style={[styles.email, { color: colors.inkMuted, fontFamily: typography.body }]}>
          {user.email}
        </Text>
      ) : null}

      {isConfigured && profile ? (
        <>
          <Text style={[styles.section, { color: colors.ink, fontFamily: typography.bodyBold }]}>
            {t('settings.account')}
          </Text>
          <LinkRow
            label={t('settings.editRegion')}
            detail={t('settings.regionValue', { region: regionLabel })}
            onPress={() => router.push('/(onboarding)/region?edit=1')}
          />
          <LinkRow
            label={t('settings.editPlatforms')}
            detail={t('settings.platformsValue', { count: profile.platforms?.length ?? 0 })}
            onPress={() => router.push('/(onboarding)/platforms?edit=1')}
          />
          <LinkRow
            label={t('settings.editDiscard')}
            detail={t('settings.discardValue', {
              policy: t(`onboarding.policy.${profile.nope_policy}`),
            })}
            onPress={() => router.push('/(onboarding)/discard-policy?edit=1')}
          />
        </>
      ) : null}

      <Text style={[styles.section, { color: colors.ink, fontFamily: typography.bodyBold }]}>
        {t('settings.title')}
      </Text>

      <Text style={[styles.label, { color: colors.inkMuted, fontFamily: typography.bodyMedium }]}>
        {t('settings.language')}
      </Text>
      <View style={styles.row}>
        {languages.map((item) => (
          <OptionRow
            key={item.id}
            label={item.label}
            selected={language === item.id}
            onPress={() => setLanguage(item.id)}
          />
        ))}
      </View>

      <Text style={[styles.label, { color: colors.inkMuted, fontFamily: typography.bodyMedium }]}>
        {t('settings.theme')}
      </Text>
      <View style={styles.row}>
        {themes.map((item) => (
          <OptionRow
            key={item.id}
            label={item.label}
            selected={themeMode === item.id}
            onPress={() => setThemeMode(item.id)}
          />
        ))}
      </View>

      {isConfigured ? (
        <Pressable
          onPress={handleSignOut}
          disabled={signingOut}
          style={[styles.signOut, { borderColor: colors.nope }]}
        >
          {signingOut ? (
            <ActivityIndicator color={colors.nope} />
          ) : (
            <Text style={{ color: colors.nope, fontFamily: typography.bodyBold, fontSize: 15 }}>
              {t('settings.signOut')}
            </Text>
          )}
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    padding: 24,
    gap: 10,
    paddingBottom: 40,
  },
  title: { fontSize: 28, marginTop: 8 },
  body: { fontSize: 16, lineHeight: 22, marginBottom: 8 },
  email: { fontSize: 14, marginBottom: 8 },
  section: { fontSize: 18, marginTop: 12 },
  label: { fontSize: 13, marginTop: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segmentRow: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 9,
    alignItems: 'center',
  },
  segmentText: { fontSize: 12 },
  option: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  linkRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signOut: {
    marginTop: 24,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
