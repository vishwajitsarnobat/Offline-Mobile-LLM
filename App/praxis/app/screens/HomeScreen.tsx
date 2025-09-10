// src/screens/HomeScreen.tsx
import React from 'react';
import { View, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import HomeScreenHeader from '@/components/HomeScreenHeader';
import InputBar from '@/components/InputBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '../components/ui/text';

// Dummy data for the suggestion prompts
const SUGGESTIONS = [
  { id: '1', title: 'Design a database schema', subtitle: 'for an online merch store' },
  { id: '2', title: 'Explain airplane travel', subtitle: 'to someone from the 1400s' },
  { id: '3', title: 'Write a thank-you note', subtitle: "for a gift I didn't like" },
  { id: '4', title: 'Plan a day trip', subtitle: 'to a nearby city' },
];

// Define the navigation prop type for type safety
type RootStackParamList = {
  Home: undefined;
  Settings: undefined;
};
type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  const handleOpenSettings = () => {
    navigation.navigate('Settings');
  };

  const handleNewChat = () => {
    // Placeholder: This will eventually clear the chat and start a new session
    console.log('New Chat pressed');
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <HomeScreenHeader onOpenSettings={handleOpenSettings} onNewChat={handleNewChat} />

      {/* --- Main Content Area --- */}
      <View className="flex-1 items-center justify-center p-4">
        {/* Placeholder for the chat list. For now, we show the empty state. */}
        <View className="items-center">
          {/* You can replace this with your own app's logo */}
          <Image
            source={{ uri: 'https://reactnativereusables.com/logo.png' }}
            style={{ width: 50, height: 50, marginBottom: 20 }}
          />
        </View>
        <FlatList
          data={SUGGESTIONS}
          numColumns={2}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card className="m-1 flex-1">
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <Text className="text-gray-500">{item.subtitle}</Text>
              </CardContent>
            </Card>
          )}
        />
      </View>

      <InputBar />
    </SafeAreaView>
  );
};

export default HomeScreen;
