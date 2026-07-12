import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/providers/AuthProvider';
import { usePreferences } from '@/providers/PreferencesProvider';

export default function Index() {
  const { ready: prefsReady, colors } = usePreferences();
  const {
    ready: authReady,
    profileReady,
    session,
    isConfigured,
    needsOnboarding,
  } = useAuth();

  if (!prefsReady || !authReady || (isConfigured && session && !profileReady)) {
    return (
      <View style={[styles.boot, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!isConfigured) {
    return <Redirect href="/(tabs)/explore" />;
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (needsOnboarding) {
    return <Redirect href="/(onboarding)/region" />;
  }

  return <Redirect href="/(tabs)/explore" />;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
