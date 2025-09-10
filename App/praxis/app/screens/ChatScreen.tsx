// src/screens/ChatScreen.tsx

import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  Button,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Text,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';
import MessageBubble from '../components/MessageBubble';

const ChatScreen = () => {
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // Select state and actions from the Zustand store
  const messages = useAppStore((state) => state.messages);
  const isAssistantLoading = useAppStore((state) => state.isAssistantLoading);
  const sendMessage = useAppStore((state) => state.sendMessage);
  const currentSessionId = useAppStore((state) => state.currentSessionId);

  const handleSend = () => {
    if (inputText.trim().length > 0) {
      sendMessage(inputText.trim());
      setInputText('');
    }
  };

  if (!currentSessionId) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <Text>Create a new session to begin.</Text>
        {/* TODO: Add a "New Session" button here */}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAwareScrollView
        contentContainerStyle={{ flex: 1 }}
        keyboardShouldPersistTaps="handled">
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item }) => <MessageBubble message={item} />}
          keyExtractor={(item) => item.id}
          style={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {isAssistantLoading && (
          <View style={styles.loader}>
            <ActivityIndicator size="small" />
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message..."
            multiline
          />
          <Button title="Send" onPress={handleSend} disabled={isAssistantLoading} />
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    flex: 1,
    paddingTop: 10,
  },
  loader: {
    alignSelf: 'flex-start',
    marginLeft: 10,
    padding: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: 'white',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
  },
});

export default ChatScreen;
