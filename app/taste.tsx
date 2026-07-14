import { Redirect } from 'expo-router';

/** Legacy route: keep bookmarks working by sending users to Bóveda → Tu gusto. */
export default function TasteRedirectScreen() {
  return <Redirect href={{ pathname: '/(tabs)/vault', params: { segment: 'taste' } }} />;
}
