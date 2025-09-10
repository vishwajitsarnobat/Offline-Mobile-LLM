// src/hooks/useDatabase.ts

import { useState, useEffect, useCallback } from 'react';
import * as DatabaseService from '../app/services/DatabaseService';
import { ChatSession, Message } from '../app/services/DatabaseService';

/**
 * A hook to manage and provide a list of all chat sessions.
 * It handles fetching, creating, deleting, and provides a loading state.
 */
export const useChatSessions = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Function to refresh the list of sessions from the database
  const refreshSessions = useCallback(async () => {
    setIsLoading(true);
    const allSessions = await DatabaseService.getAllSessions();
    setSessions(allSessions);
    setIsLoading(false);
  }, []);

  // Initial fetch when the hook is first used
  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  // Function to create a new session and update the list
  const createSession = useCallback(async (title: string) => {
    const newSession = await DatabaseService.createNewSession(title);
    setSessions((prevSessions) => [newSession, ...prevSessions]);
    return newSession; // Return the new session for navigation purposes
  }, []);

  // Function to delete a session and update the list
  const deleteSession = useCallback(async (sessionId: string) => {
    await DatabaseService.deleteSession(sessionId);
    setSessions((prevSessions) => prevSessions.filter((s) => s.id !== sessionId));
  }, []);

  return {
    sessions,
    isLoading,
    createSession,
    deleteSession,
    refreshSessions,
  };
};

/**
 * A hook to manage the messages for a single, specific chat session.
 */
export const useChatMessages = (sessionId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch messages whenever the sessionId changes
  useEffect(() => {
    const fetchMessages = async () => {
      if (!sessionId) {
        setMessages([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const sessionMessages = await DatabaseService.getMessagesForSession(sessionId);
      setMessages(sessionMessages);
      setIsLoading(false);
    };

    fetchMessages();
  }, [sessionId]);

  // A function to manually add a new message to the state
  // This provides an instant UI update without needing a full re-fetch.
  const addMessageToState = useCallback((message: Message) => {
    setMessages((prevMessages) => [...prevMessages, message]);
  }, []);

  return {
    messages,
    isLoading,
    addMessageToState,
  };
};
