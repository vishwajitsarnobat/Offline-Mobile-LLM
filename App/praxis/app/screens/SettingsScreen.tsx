// src/screens/SettingsScreen.tsx
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { X } from 'lucide-react-native';

// Import reusable components
import { Button } from '../components/ui/button';
import { Text } from '../components/ui/text';

const SettingsScreen = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 40 }} /> {/* Spacer */}
        <Text className="text-lg font-semibold">Settings</Text>
        <Button variant="ghost" size="icon" onPress={() => navigation.goBack()}>
          <X size={24} color="black" />
        </Button>
      </View>

      {/* Body */}
      <ScrollView contentContainerStyle={styles.content}>
        {/* Placeholder for settings items */}
        <Text className="p-8 text-center">Settings items will go here.</Text>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button variant="outline">
          <Text>Logout</Text>
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7', // A light grey background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#E5E5E5',
  },
  content: {
    padding: 16,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#E5E5E5',
  },
});

export default SettingsScreen;
