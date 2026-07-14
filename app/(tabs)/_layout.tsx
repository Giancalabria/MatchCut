import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/providers/AuthProvider';
import { useThemeColors } from '@/providers/PreferencesProvider';
import { AppIcon } from '@/src/ui/AppIcon';
import { typography } from '@/theme/typography';

export default function TabsLayout() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { ready, profileReady, session, isConfigured, needsOnboarding } = useAuth();

  if (!ready || (isConfigured && session && !profileReady)) {
    return (
      <View style={[styles.boot, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.cta} />
      </View>
    );
  }

  if (isConfigured && !session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (needsOnboarding) {
    return <Redirect href="/(onboarding)/region" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          paddingBottom: Math.max(insets.bottom, 6),
          height: 56 + Math.max(insets.bottom, 6),
        },
        tabBarActiveTintColor: colors.cta,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarLabelStyle: { fontFamily: typography.bodyMedium, fontSize: 12 },
      }}
    >
      <Tabs.Screen
        name="explore"
        options={{
          title: t('tabs.explore'),
          tabBarIcon: ({ color, focused }) => (
            <AppIcon
              name={focused ? 'explore' : 'exploreOutline'}
              color={typeof color === 'string' ? color : colors.inkMuted}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="rooms"
        options={{
          title: t('tabs.rooms'),
          tabBarIcon: ({ color, focused }) => (
            <AppIcon
              name={focused ? 'rooms' : 'roomsOutline'}
              color={typeof color === 'string' ? color : colors.inkMuted}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: t('tabs.vault'),
          tabBarIcon: ({ color, focused }) => (
            <AppIcon
              name={focused ? 'vault' : 'vaultOutline'}
              color={typeof color === 'string' ? color : colors.inkMuted}
              size={22}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
