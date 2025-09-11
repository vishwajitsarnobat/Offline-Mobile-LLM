import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from 'components/ui/text';
import { Button } from 'components/ui/button';
import { Card, CardContent } from 'components/ui/card';
import { Input } from 'components/ui/input';
import { Badge } from 'components/ui/badge';
import { databaseService } from 'src/services/database';
import { modelManager } from 'src/services/models';

interface Message {
  id: number;
  content: string;
  role: 'user' | 'assistant';
  created_at: string;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<number | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    initializeChat();
    initializeModel();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const initializeChat = async () => {
    try {
      const chatId = await databaseService.createNewChat('New Conversation');
      setCurrentChatId(chatId);
      
      await databaseService.addMessage(
        chatId, 
        "Hello! I'm your offline AI assistant powered by Microsoft Phi-3 Mini. I can help with medical guidance, travel advice, and survival techniques. How can I assist you today?", 
        'assistant'
      );
      
      loadMessages(chatId);
    } catch (error) {
      console.error('Failed to initialize chat:', error);
    }
  };

  const initializeModel = async () => {
    try {
      await modelManager.initializeModel();
      const model = await modelManager.getCurrentModel();
      setCurrentModel(model);
      console.log('Model manager initialized');
    } catch (error) {
      console.error('Failed to initialize model:', error);
    }
  };

  const loadMessages = async (chatId: number) => {
    try {
      const chatMessages = await databaseService.getChatMessages(chatId);
      setMessages(chatMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const generateOfflineResponse = async (userMessage: string): Promise<string> => {
    try {
      // Build conversation history for context
      const conversationHistory = messages.slice(-6).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));

      const response = await modelManager.generateResponse(userMessage, conversationHistory);
      return response;
    } catch (error) {
      console.error('Model response error:', error);
      return "I apologize, but I'm having trouble processing your request right now. Please try again.";
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !currentChatId || loading) return;

    const userMessage = inputText.trim();
    setInputText('');
    setLoading(true);

    try {
      await databaseService.addMessage(currentChatId, userMessage, 'user');
      await loadMessages(currentChatId);
      
      const aiResponse = await generateOfflineResponse(userMessage);
      
      await databaseService.addMessage(currentChatId, aiResponse, 'assistant');
      await loadMessages(currentChatId);
      
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-background" 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View className="pt-12 pb-4 px-4 border-b border-border bg-background">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold">Offline Assistant</Text>
            <Text className="text-muted-foreground">
              {messages.length > 1 ? `${messages.length - 1} messages` : 'Ready to help offline'}
            </Text>
          </View>
          <View className="items-end">
            <Badge variant="secondary">
              <Text className="text-xs">🔒 Offline</Text>
            </Badge>
            {currentModel && (
              <Badge variant="default" className="mt-1">
                <Text className="text-xs">🧠 {currentModel}</Text>
              </Badge>
            )}
          </View>
        </View>
      </View>

      {/* Messages */}
      <ScrollView 
        ref={scrollViewRef}
        className="flex-1 p-4"
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            className={`mb-4 max-w-[85%] ${
              message.role === 'user' ? 'ml-auto' : 'mr-auto'
            }`}
          >
            <Card className={message.role === 'user' ? 'bg-primary' : ''}>
              <CardContent className="p-4">
                <Text 
                  className={`leading-6 ${
                    message.role === 'user' ? 'text-primary-foreground' : 'text-card-foreground'
                  }`}
                >
                  {message.content}
                </Text>
              </CardContent>
            </Card>
            <Text className={`text-xs text-muted-foreground mt-2 px-1 ${
              message.role === 'user' ? 'text-right' : 'text-left'
            }`}>
              {formatTime(message.created_at)}
            </Text>
          </View>
        ))}
        
        {loading && (
          <View className="mr-auto mb-4 max-w-[85%]">
            <Card>
              <CardContent className="p-4">
                <Text className="text-muted-foreground">
                  {currentModel ? `${currentModel} is thinking...` : 'Thinking...'}
                </Text>
              </CardContent>
            </Card>
          </View>
        )}
      </ScrollView>

      {/* Input Area */}
      <View className="p-4 border-t border-border bg-background">
        <View className="flex-row items-end gap-3">
          <View className="flex-1">
            <Input
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask about medical, travel, or survival topics..."
              multiline
              className="min-h-[44px] max-h-[120px]"
              onSubmitEditing={sendMessage}
            />
          </View>
          <Button 
            onPress={sendMessage}
            disabled={!inputText.trim() || loading}
            size="icon"
            variant={inputText.trim() ? "default" : "secondary"}
          >
            <Text className="text-lg">
              {loading ? '⏳' : '➤'}
            </Text>
          </Button>
        </View>
        
        <View className="flex-row justify-between mt-3">
          <Badge variant="outline">
            <Text className="text-xs">
              {currentModel ? `Powered by ${currentModel}` : 'All conversations stored locally'}
            </Text>
          </Badge>
          <Text className="text-xs text-muted-foreground">
            {inputText.length}/500
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
