import { Link, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useThemeColors } from '@/providers/PreferencesProvider';
import { AppText } from '@/src/ui';
import { layout, space } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export default function NotFoundScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <>
      <Stack.Screen options={{ title: t('common.notFoundTitle'), headerShown: true }} />
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <AppText variant="title" style={styles.title}>
          {t('common.notFoundBody')}
        </AppText>
        <Link href="/(tabs)/explore" style={styles.link}>
          <AppText color={colors.accent} style={{ fontFamily: typography.bodyMedium }}>
            {t('common.notFoundCta')}
          </AppText>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: layout.screenPaddingX,
  },
  title: { textAlign: 'center' },
  link: { marginTop: space.sm },
});
