import { Redirect, Tabs } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/providers/AuthProvider';
import { useThemeColors } from '@/providers/PreferencesProvider';
import { typography } from '@/theme/typography';

function TabIcon({
  name,
  color,
}: {
  name: 'compass' | 'users' | 'archive';
  color: string;
}) {
  return <FontAwesome name={name} size={20} color={color} />;
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { ready, profileReady, session, isConfigured, needsOnboarding } = useAuth();

  if (!ready || (isConfigured && session && !profileReady)) {
    return (
      <View style={[styles.boot, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.accent} />
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
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: typography.display, fontSize: 20 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarLabelStyle: { fontFamily: typography.bodyMedium, fontSize: 12 },
      }}
    >
      <Tabs.Screen
        name="explore"
        options={{
          title: t('tabs.explore'),
          tabBarIcon: ({ color }) => (
            <TabIcon name="compass" color={typeof color === 'string' ? color : colors.inkMuted} />
          ),
        }}
      />
      <Tabs.Screen
        name="rooms"
        options={{
          title: t('tabs.rooms'),
          tabBarIcon: ({ color }) => (
            <TabIcon name="users" color={typeof color === 'string' ? color : colors.inkMuted} />
          ),
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: t('tabs.vault'),
          tabBarIcon: ({ color }) => (
            <TabIcon name="archive" color={typeof color === 'string' ? color : colors.inkMuted} />
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
