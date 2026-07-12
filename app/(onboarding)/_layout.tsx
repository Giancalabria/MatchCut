import { Stack } from 'expo-router';

import { useThemeColors } from '@/providers/PreferencesProvider';

export default function OnboardingLayout() {
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.ink,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
