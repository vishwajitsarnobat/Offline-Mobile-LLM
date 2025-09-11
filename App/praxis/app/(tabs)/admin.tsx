import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert, RefreshControl } from 'react-native';
import { Text } from 'components/ui/text';
import { Button } from 'components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'components/ui/card';
import { Badge } from 'components/ui/badge';
import { Separator } from 'components/ui/separator';
import { Input } from 'components/ui/input';
import { databaseService } from 'src/services/database';

interface ChatInfo {
  id: number;
  title: string;
  messageCount: number;
  created_at: string;
  updated_at: string;
}

interface SystemStats {
  totalChats: number;
  totalMessages: number;
  databaseSize: string;
  lastActivity: string;
}

export default function AdminScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [chats, setChats] = useState<ChatInfo[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Simple demo credentials - in production, use secure authentication
  const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123'
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAdminData();
    }
  }, [isAuthenticated]);

  const handleAdminLogin = async () => {
    if (adminUsername === ADMIN_CREDENTIALS.username && 
        adminPassword === ADMIN_CREDENTIALS.password) {
      setIsAuthenticated(true);
      setAdminUsername('');
      setAdminPassword('');
      Alert.alert('Success', 'Admin access granted');
      await loadAdminData();
    } else {
      Alert.alert('Error', 'Invalid admin credentials');
    }
  };

  const loadAdminData = async () => {
    setLoading(true);
    try {
      await loadChats();
      await loadSystemStats();
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChats = async () => {
    try {
      const allChats = await databaseService.getAllChats();
      
      // Get message count for each chat
      const chatsWithMessageCount = await Promise.all(
        allChats.map(async (chat) => {
          const messages = await databaseService.getChatMessages(chat.id);
          return {
            id: chat.id,
            title: chat.title,
            messageCount: messages.length,
            created_at: chat.created_at,
            updated_at: chat.updated_at
          };
        })
      );
      
      setChats(chatsWithMessageCount);
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  };

  const loadSystemStats = async () => {
    try {
      const allChats = await databaseService.getAllChats();
      let totalMessages = 0;
      let lastActivity = '';
      
      for (const chat of allChats) {
        const messages = await databaseService.getChatMessages(chat.id);
        totalMessages += messages.length;
        
        if (chat.updated_at > lastActivity) {
          lastActivity = chat.updated_at;
        }
      }

      setSystemStats({
        totalChats: allChats.length,
        totalMessages,
        databaseSize: '< 1MB', // Placeholder - would calculate actual size in production
        lastActivity: lastActivity ? new Date(lastActivity).toLocaleString() : 'No activity'
      });
    } catch (error) {
      console.error('Failed to load system stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAdminData();
    setRefreshing(false);
  };

  const viewChatDetails = async (chatId: number, chatTitle: string) => {
    try {
      const messages = await databaseService.getChatMessages(chatId);
      const messagePreview = messages.slice(-3).map(m => 
        `${m.role === 'user' ? 'User' : 'AI'}: ${m.content.substring(0, 100)}...`
      ).join('\n\n');
      
      Alert.alert(
        `Chat: ${chatTitle}`,
        `Messages: ${messages.length}\n\nRecent messages:\n\n${messagePreview}`,
        [
          { text: 'OK', style: 'default' }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to load chat details');
    }
  };

  const clearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all chats and messages. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              // In production, you'd implement proper data clearing
              Alert.alert('Info', 'Data clearing would be implemented here');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
            }
          }
        }
      ]
    );
  };

  if (!isAuthenticated) {
    return (
      <View className="flex-1 bg-background justify-center p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">🔐 Admin Access</CardTitle>
            <CardDescription className="text-center">
              Access admin dashboard to monitor chat logs, system performance, and manage the knowledge base.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <View>
              <Text className="text-sm font-medium mb-2">Username</Text>
              <Input
                value={adminUsername}
                onChangeText={setAdminUsername}
                placeholder="Enter admin username"
                autoCapitalize="none"
              />
            </View>
            <View>
              <Text className="text-sm font-medium mb-2">Password</Text>
              <Input
                value={adminPassword}
                onChangeText={setAdminPassword}
                placeholder="Enter admin password"
                secureTextEntry
              />
            </View>
            <Button onPress={handleAdminLogin} className="mt-4">
              <Text>Login as Admin</Text>
            </Button>
            <View className="mt-4 p-3 bg-muted rounded-lg">
              <Text className="text-xs text-muted-foreground text-center">
                Demo credentials: admin / admin123
              </Text>
            </View>
          </CardContent>
        </Card>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="pt-12 pb-4 px-4 border-b border-border">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-2xl font-bold">Admin Dashboard</Text>
            <Text className="text-muted-foreground">System monitoring & management</Text>
          </View>
          <Badge variant="default">
            <Text className="text-xs">Admin</Text>
          </Badge>
        </View>
      </View>

      <ScrollView 
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* System Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>📊 System Overview</CardTitle>
            <CardDescription>Real-time system statistics</CardDescription>
          </CardHeader>
          <CardContent>
            {systemStats ? (
              <View className="space-y-3">
                <View className="flex-row justify-between">
                  <Text>Total Conversations</Text>
                  <Badge variant="secondary">
                    <Text className="text-xs">{systemStats.totalChats}</Text>
                  </Badge>
                </View>
                <View className="flex-row justify-between">
                  <Text>Total Messages</Text>
                  <Badge variant="secondary">
                    <Text className="text-xs">{systemStats.totalMessages}</Text>
                  </Badge>
                </View>
                <View className="flex-row justify-between">
                  <Text>Database Size</Text>
                  <Badge variant="outline">
                    <Text className="text-xs">{systemStats.databaseSize}</Text>
                  </Badge>
                </View>
                <View className="flex-row justify-between">
                  <Text>Last Activity</Text>
                  <Text className="text-xs text-muted-foreground">
                    {systemStats.lastActivity}
                  </Text>
                </View>
              </View>
            ) : (
              <Text className="text-muted-foreground">Loading system stats...</Text>
            )}
          </CardContent>
        </Card>

        {/* Chat Management */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>💬 Chat Management</CardTitle>
            <CardDescription>View and manage user conversations</CardDescription>
          </CardHeader>
          <CardContent>
            {chats.length > 0 ? (
              <>
                {chats.map((chat, index) => (
                  <View key={chat.id}>
                    <View className="py-3">
                      <View className="flex-row justify-between items-start mb-2">
                        <View className="flex-1">
                          <Text className="font-medium">{chat.title}</Text>
                          <Text className="text-xs text-muted-foreground">
                            Created: {new Date(chat.created_at).toLocaleDateString()}
                          </Text>
                        </View>
                        <Badge variant="outline">
                          <Text className="text-xs">{chat.messageCount} msgs</Text>
                        </Badge>
                      </View>
                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => viewChatDetails(chat.id, chat.title)}
                      >
                        <Text className="text-xs">View Details</Text>
                      </Button>
                    </View>
                    {index < chats.length - 1 && <Separator />}
                  </View>
                ))}
              </>
            ) : (
              <Text className="text-muted-foreground">No conversations found</Text>
            )}
          </CardContent>
        </Card>

        {/* Admin Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>⚙️ Admin Actions</CardTitle>
            <CardDescription>System management and maintenance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" onPress={onRefresh} disabled={loading}>
              <Text>🔄 Refresh Data</Text>
            </Button>
            <Button variant="outline" onPress={() => Alert.alert('Info', 'Export functionality would be implemented here')}>
              <Text>📤 Export Logs</Text>
            </Button>
            <Button variant="destructive" onPress={clearAllData}>
              <Text>🗑️ Clear All Data</Text>
            </Button>
            <Separator />
            <Button variant="secondary" onPress={() => setIsAuthenticated(false)}>
              <Text>🚪 Logout</Text>
            </Button>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>🟢 System Status</CardTitle>
            <CardDescription>Current system health</CardDescription>
          </CardHeader>
          <CardContent>
            <View className="space-y-2">
              <View className="flex-row justify-between items-center">
                <Text>Database Connection</Text>
                <Badge variant="default">
                  <Text className="text-xs">✅ Online</Text>
                </Badge>
              </View>
              <View className="flex-row justify-between items-center">
                <Text>Model System</Text>
                <Badge variant="secondary">
                  <Text className="text-xs">🔄 Ready</Text>
                </Badge>
              </View>
              <View className="flex-row justify-between items-center">
                <Text>File System</Text>
                <Badge variant="default">
                  <Text className="text-xs">✅ Available</Text>
                </Badge>
              </View>
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    </View>
  );
}
