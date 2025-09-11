import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert, Platform, RefreshControl } from 'react-native';
import { Text } from 'components/ui/text';
import { Button } from 'components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'components/ui/card';
import { Badge } from 'components/ui/badge';
import { Separator } from 'components/ui/separator';
import { databaseService } from 'src/services/database';
import { modelManager } from 'src/services/models/ModelManager'; // Ensure this path is correct

// This interface must match the one in your ModelManager, including downloadUrl
interface ModelConfig {
  name: string;
  filename: string;
  size: string;
  description: string;
  loaded: boolean; // True if downloaded/available locally
  downloadUrl: string;
  quantization: string;
  contextLength: number;
}

export default function SettingsScreen() {
  // State for existing functionality
  const [dbStatus, setDbStatus] = useState<string>('Not tested');
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState<ModelConfig | null>(null);
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [modelLoading, setModelLoading] = useState(true);
  const [modelLoadingInProgress, setModelLoadingInProgress] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [systemStats, setSystemStats] = useState({
    totalChats: 0,
    totalMessages: 0,
    databaseConnected: false,
    modelInitialized: false,
  });

  // State for new download functionality
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    await Promise.all([loadModelStatus(), loadCurrentModel(), loadSystemStats()]);
  };

  const loadModelStatus = async () => {
    try {
      setModelLoading(true);
      await modelManager.initializeModel(); // Checks if the model file exists
      const modelInfo = modelManager.getModelInfo();
      setModel(modelInfo as ModelConfig); // Cast to ensure type includes downloadUrl
    } catch (error) {
      console.error('Failed to load model status:', error);
    } finally {
      setModelLoading(false);
    }
  };

  const loadCurrentModel = async () => {
    try {
      const current = await modelManager.getCurrentModel();
      setCurrentModel(current);
    } catch (error) {
      console.error('Failed to get current model:', error);
    }
  };

  const loadSystemStats = async () => {
    try {
      const allChats = await databaseService.getAllChats();
      let totalMessages = 0;
      for (const chat of allChats) {
        const messages = await databaseService.getChatMessages(chat.id);
        totalMessages += messages.length;
      }
      setSystemStats({
        totalChats: allChats.length,
        totalMessages,
        databaseConnected: true,
        modelInitialized: !!model,
      });
    } catch (error) {
      console.error('Failed to load system stats:', error);
      setSystemStats({
        totalChats: 0,
        totalMessages: 0,
        databaseConnected: false,
        modelInitialized: false,
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const handleModelDownload = async () => {
    if (!model || !modelManager.needsDownload()) return;

    Alert.alert(
      'Download Large Model',
      `Download ${model.name}?\n\nSize: ${model.size}\nThis will use mobile data and storage space.\n\nRecommended: Use WiFi for download.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download',
          onPress: async () => {
            setDownloading(true);
            try {
              await modelManager.downloadModel((progress) => {
                setDownloadProgress(progress);
              });
              Alert.alert('Success', `${model.name} downloaded successfully!`);
              await loadModelStatus(); // Re-check status to update the UI
            } catch (error) {
              Alert.alert('Download Failed', `Failed to download model: ${error}`);
            } finally {
              setDownloading(false);
              setDownloadProgress(0);
            }
          },
        },
      ]
    );
  };

  const testDatabase = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Info', 'Database features are mobile-only. Please test on device/simulator.');
      return;
    }
    setLoading(true);
    setDbStatus('Testing...');
    try {
      const success = await databaseService.testConnection();
      if (success) {
        setDbStatus('✅ Database working!');
        Alert.alert('Success', 'Database connection and chat creation successful!');
        await loadSystemStats();
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

  const handleModelAction = async () => {
    if (!model) return;

    if (modelLoadingInProgress) {
      Alert.alert('Please Wait', 'Model operation in progress...');
      return;
    }

    // This handles the "Manage Active Model" case
    if (currentModel === model.name) {
      Alert.alert(
        'Active Model',
        `${model.name} is currently active and processing your conversations.`,
        [
          { text: 'OK', style: 'default' },
          {
            text: 'Unload Model',
            style: 'destructive',
            onPress: async () => {
              setModelLoadingInProgress(true);
              try {
                await modelManager.unloadModel();
                setCurrentModel(null);
                Alert.alert('Success', 'Phi-3 Mini unloaded.');
              } catch (error) {
                Alert.alert('Error', `Failed to unload model: ${error}`);
              } finally {
                setModelLoadingInProgress(false);
              }
            },
          },
        ]
      );
      return;
    }

    // This handles the "Load Model" case (only possible if downloaded)
    if (model.loaded) {
      Alert.alert(
        'Load Phi-3 Mini',
        `Load Microsoft Phi-3 Mini for real AI responses? First load may take 30-60 seconds.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Load Model',
            onPress: async () => {
              setModelLoadingInProgress(true);
              try {
                const success = await modelManager.loadModel();
                if (success) {
                  Alert.alert('Success!', `${model.name} is now active!`);
                  await loadCurrentModel();
                } else {
                  Alert.alert('Loading Failed', `Failed to load ${model.name}.`);
                }
              } catch (error) {
                Alert.alert('Error', `Error loading model: ${error}`);
              } finally {
                setModelLoadingInProgress(false);
              }
            },
          },
        ]
      );
    }
  };

  // Helper functions for UI
  const getModelBadgeVariant = () => {
    if (!model) return 'outline';
    if (!model.loaded) return 'destructive';
    return currentModel === model.name ? 'default' : 'secondary';
  };

  const getModelStatusText = () => {
    if (!model) return 'Loading...';
    if (!model.loaded) return 'Not Downloaded';
    return currentModel === model.name ? 'Active' : 'Ready to Load';
  };

  const exportData = () => { /* Placeholder */ Alert.alert('Not Implemented', 'Export functionality is not yet available.'); };
  const clearAllData = () => { /* Placeholder */ Alert.alert('Not Implemented', 'Data clearing is not yet available.'); };
  const resetSettings = () => { /* Placeholder */ Alert.alert('Not Implemented', 'Settings reset is not yet available.'); };

  return (
    <View className="flex-1 bg-background">
      <View className="pt-12 pb-4 px-4 border-b border-border">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-2xl font-bold">Settings</Text>
            <Text className="text-muted-foreground">Offline AI assistant configuration</Text>
          </View>
          <Badge variant="secondary"><Text className="text-xs">v1.0.0</Text></Badge>
        </View>
      </View>

      <ScrollView className="flex-1 p-4" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>📊 System Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <View className="flex-row justify-between"><Text>Total Conversations</Text><Badge variant="secondary"><Text className="text-xs">{systemStats.totalChats}</Text></Badge></View>
            <View className="flex-row justify-between"><Text>Total Messages</Text><Badge variant="secondary"><Text className="text-xs">{systemStats.totalMessages}</Text></Badge></View>
            <View className="flex-row justify-between"><Text>Database Status</Text><Badge variant={systemStats.databaseConnected ? "default" : "destructive"}><Text className="text-xs">{systemStats.databaseConnected ? '✅ Connected' : '❌ Disconnected'}</Text></Badge></View>
            <View className="flex-row justify-between"><Text>Model Status</Text><Badge variant={currentModel ? "default" : "outline"}><Text className="text-xs">{currentModel ? '🧠 AI Active' : '💡 Placeholder Mode'}</Text></Badge></View>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>🧠 Phi-3 Mini Model</CardTitle>
            <CardDescription>Advanced offline AI for mobile devices</CardDescription>
          </CardHeader>
          <CardContent>
            {modelLoading ? <Text>Loading model info...</Text> : model ? (
              <>
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1 pr-2">
                    <Text className="font-semibold text-lg">{model.name}</Text>
                    <Text className="text-muted-foreground text-sm mb-2">{model.description}</Text>
                    <View className="flex-row flex-wrap gap-2">
                      <Badge variant="secondary"><Text className="text-xs">{model.size}</Text></Badge>
                      <Badge variant="secondary"><Text className="text-xs">{model.quantization}</Text></Badge>
                    </View>
                  </View>
                  <Badge variant={getModelBadgeVariant()}><Text className="text-xs">{getModelStatusText()}</Text></Badge>
                </View>

                {modelManager.needsDownload() ? (
                  <View className="my-4">
                    {downloading ? (
                      <View>
                        <Text className="text-sm text-muted-foreground mb-2">Downloading: {downloadProgress.toFixed(1)}%</Text>
                        <View className="w-full bg-muted rounded-full h-2.5">
                          <View className="bg-primary h-2.5 rounded-full" style={{ width: `${downloadProgress}%` }} />
                        </View>
                      </View>
                    ) : (
                      <Button onPress={handleModelDownload} variant="default"><Text>📥 Download {model.name}</Text></Button>
                    )}
                  </View>
                ) : (
                  <View className="my-4">
                    <Button
                      onPress={handleModelAction}
                      disabled={modelLoadingInProgress}
                      variant={currentModel === model.name ? "secondary" : "default"}
                    >
                      <Text>
                        {modelLoadingInProgress ? '⏳ Processing...' : currentModel === model.name ? '⚙️ Manage Active Model' : '🚀 Load Phi-3 Mini'}
                      </Text>
                    </Button>
                  </View>
                )}

                <Separator className="my-4" />
                <View className="bg-muted/50 p-4 rounded-lg">
                  <Text className="text-sm font-medium text-foreground mb-2">🎯 Specialization Areas:</Text>
                  <Text className="text-xs text-muted-foreground">
                    • 🏥 Medical guidance and health information{'\n'}
                    • ✈️ Travel advice and safety recommendations{'\n'}
                    • 🏕️ Survival techniques and emergency preparedness
                  </Text>
                </View>
              </>
            ) : <Text>Failed to load model information.</Text>}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader><CardTitle>🧪 System Testing</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <View className="flex-row justify-between items-center">
              <Text>Database Status:</Text>
              <Badge variant={dbStatus.includes('✅') ? 'default' : 'destructive'}><Text className="text-xs">{dbStatus}</Text></Badge>
            </View>
            <Button onPress={testDatabase} disabled={loading} variant="outline">
              <Text>{loading ? 'Testing...' : '🔧 Test Database Connection'}</Text>
            </Button>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader><CardTitle>💾 Data Management</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" onPress={exportData}><Text>📤 Export Chat Data</Text></Button>
            <Button variant="outline" onPress={resetSettings}><Text>🔄 Reset Settings</Text></Button>
            <Button variant="destructive" onPress={clearAllData}><Text>🗑️ Clear All Data</Text></Button>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader><CardTitle>🔒 Privacy & Security</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <View className="flex-row justify-between"><Text>Data Storage</Text><Badge variant="default"><Text className="text-xs">🏠 Local Only</Text></Badge></View>
            <View className="flex-row justify-between"><Text>AI Processing</Text><Badge variant="default"><Text className="text-xs">📱 On-Device</Text></Badge></View>
            <View className="flex-row justify-between"><Text>Analytics/Tracking</Text><Badge variant="outline"><Text className="text-xs">🚫 None</Text></Badge></View>
          </CardContent>
        </Card>
      </ScrollView>
    </View>
  );
}