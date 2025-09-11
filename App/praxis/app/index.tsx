import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to the main tab navigation
  return <Redirect href="/(tabs)/chat" />;
}
