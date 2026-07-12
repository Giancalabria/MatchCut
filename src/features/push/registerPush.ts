import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { supabase } from '@/lib/supabase';

export async function registerPush(userId: string): Promise<string | null> {
  if (!Device.isDevice) {
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
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;

  const { error } = await supabase
    .from('profiles')
    .update({ expo_push_token: token, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    throw error;
  }

  return token;
}
