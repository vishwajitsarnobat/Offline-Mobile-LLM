import React, { useState } from 'react';
import { View, Alert, Platform } from 'react-native';
import { Text } from 'components/ui/text';
import { Button } from 'components/ui/button';
import { databaseService } from 'src/services/database';

export function TestScreen() {
  const [dbStatus, setDbStatus] = useState<string>('Not tested');
  const [loading, setLoading] = useState(false);

  const testDatabase = async () => {
    setLoading(true);
    setDbStatus('Testing...');
    
    if (Platform.OS === 'web') {
      setDbStatus('📱 Mobile-only feature');
      Alert.alert('Info', 'Database features are mobile-only. Please test on device/simulator.');
      setLoading(false);
      return;
    }
    
    try {
      const success = await databaseService.testConnection();
      if (success) {
        setDbStatus('✅ Database working!');
        Alert.alert('Success', 'Database connection successful!');
      } else {
        setDbStatus('❌ Database failed');
        Alert.alert('Error', 'Database test failed');
      }
    } catch (error) {
      setDbStatus('❌ Database error');
      Alert.alert('Error', `Database error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center items-center p-4">
      <Text className="text-xl mb-4">Database Test</Text>
      <Text className="mb-2">Platform: {Platform.OS}</Text>
      <Text className="mb-4">Status: {dbStatus}</Text>
      <Button 
        onPress={testDatabase}
        disabled={loading}
      >
        <Text>{loading ? 'Testing...' : 'Test Database'}</Text>
      </Button>
      
      {Platform.OS === 'web' && (
        <Text className="mt-4 text-center text-gray-600">
          💡 This is a mobile-first offline app.{'\n'}
          Database features work on iOS/Android only.
        </Text>
      )}
    </View>
  );
}
