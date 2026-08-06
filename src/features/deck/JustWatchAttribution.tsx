import { Linking, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useThemeColors } from '@/providers/PreferencesProvider';
import { AppText } from '@/src/ui';

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
      <AppText muted variant="label" color={colors.inkMuted} style={styles.text}>
        {t('justwatch.attribution')}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'flex-start',
  },
  text: {
    textDecorationLine: 'underline',
  },
});
