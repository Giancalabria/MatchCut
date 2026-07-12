import { Stack } from 'expo-router';

import { useThemeColors } from '@/providers/PreferencesProvider';

export default function AuthLayout() {
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
