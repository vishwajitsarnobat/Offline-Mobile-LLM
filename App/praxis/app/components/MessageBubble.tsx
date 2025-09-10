// src/components/MessageBubble.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Message } from '../services/DatabaseService';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      <Text style={isUser ? styles.userText : styles.assistantText}>{message.content}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 18,
    marginVertical: 5,
    maxWidth: '80%',
  },
  userContainer: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
    marginRight: 10,
  },
  assistantContainer: {
    backgroundColor: '#E5E5EA',
    alignSelf: 'flex-start',
    marginLeft: 10,
  },
  userText: {
    color: 'white',
    fontSize: 16,
  },
  assistantText: {
    color: 'black',
    fontSize: 16,
  },
});

export default React.memo(MessageBubble);
