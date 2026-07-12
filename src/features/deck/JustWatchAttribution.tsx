import { Linking, Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useThemeColors } from '@/providers/PreferencesProvider';
import { typography } from '@/theme/typography';

const JUSTWATCH_URL = 'https://www.justwatch.com';

export function JustWatchAttribution({ link }: { link?: string | null }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const target = link ?? JUSTWATCH_URL;

  return (
    <Pressable
      onPress={() => {
        void Linking.openURL(target);
      }}
      style={styles.root}
    >
      <Text style={[styles.text, { color: colors.inkMuted, fontFamily: typography.body }]}>
        {t('justwatch.attribution')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});
