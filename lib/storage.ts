import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@matchcut:';

export async function getStoredString(key: string): Promise<string | null> {
  return AsyncStorage.getItem(PREFIX + key);
}

export async function setStoredString(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(PREFIX + key, value);
}
