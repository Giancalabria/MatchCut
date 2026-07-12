import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/providers/PreferencesProvider';
import { typography } from '@/theme/typography';

export default function NotFoundScreen() {
  const colors = useThemeColors();

  return (
    <>
      <Stack.Screen options={{ title: 'Oops', headerShown: true }} />
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <Text style={[styles.title, { color: colors.ink, fontFamily: typography.display }]}>
          Screen not found
        </Text>
        <Link href="/(tabs)/explore" style={{ marginTop: 12 }}>
          <Text style={{ color: colors.accent, fontFamily: typography.bodyMedium }}>
            Go to Explore
          </Text>
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
    padding: 24,
  },
  title: { fontSize: 22 },
});
