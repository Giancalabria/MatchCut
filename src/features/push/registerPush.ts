import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';

import { supabase } from '@/lib/supabase';

function isRemotePushAvailable(): boolean {
  if (!Device.isDevice) {
    return false;
  }

  // Remote push was removed from Expo Go (Android SDK 53+). Skip import entirely.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return false;
  }

  return true;
}

export async function registerPush(userId: string): Promise<string | null> {
  if (!isRemotePushAvailable()) {
    return null;
  }

  let Notifications: typeof import('expo-notifications');
  try {
    Notifications = await import('expo-notifications');
  } catch (error) {
    console.warn('Push notifications unavailable', error);
    return null;
  }

  const current = await Notifications.getPermissionsAsync();
  const finalStatus =
    current.status === 'granted'
      ? current.status
      : (await Notifications.requestPermissionsAsync()).status;

  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

  const token = (
    await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
  ).data;

  const { error } = await supabase
    .from('profiles')
    .update({ expo_push_token: token, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    throw error;
  }

  return token;
}
