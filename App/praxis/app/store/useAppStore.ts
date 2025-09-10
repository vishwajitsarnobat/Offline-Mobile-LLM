// src/store/useAppStore.ts

import { create } from 'zustand';
import { ChatSession, Message } from '../services/DatabaseService';
import * as ChatService from '../services/ChatService';

// --- STATE AND ACTIONS INTERFACES ---

interface AppState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  messages: Message[];
  isAssistantLoading: boolean;
}

interface AppActions {
  initialize: () => Promise<void>;
  loadSessions: () => Promise<void>;
  selectSession: (sessionId: string) => Promise<void>;
  createNewSession: (title: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
}

// --- ZUSTAND STORE ---

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  // --- Initial State ---
  sessions: [],
  currentSessionId: null,
  messages: [],
  isAssistantLoading: false,

  // --- Actions ---

  /** Loads initial data for the app. */
  initialize: async () => {
    await get().loadSessions();
    const { sessions } = get();
    if (sessions.length > 0) {
      await get().selectSession(sessions[0].id);
    }
  },

  /** Fetches all sessions from the database and updates the state. */
  loadSessions: async () => {
    const sessions = await ChatService.getAllSessions();
    set({ sessions });
  },

  /** Selects a session and loads its messages. */
  selectSession: async (sessionId: string) => {
    set({ messages: [], isAssistantLoading: true }); // Clear old messages and show loader
    const messages = await ChatService.getMessagesForSession(sessionId);
    set({ currentSessionId: sessionId, messages, isAssistantLoading: false });
  },

  /** Creates a new session and automatically selects it. */
  createNewSession: async (title: string) => {
    const newSession = await ChatService.createNewSession(title);
    set((state) => ({
      sessions: [newSession, ...state.sessions],
      messages: [],
      currentSessionId: newSession.id,
    }));
  },

  /** Handles the entire process of sending a message and receiving a response. */
  sendMessage: async (content: string) => {
    const sessionId = get().currentSessionId;
    if (!sessionId) return;

    // Optimistic UI update for the user's message
    const userMessage = ChatService.createUserMessage(sessionId, content);
    set((state) => ({ messages: [...state.messages, userMessage] }));
    set({ isAssistantLoading: true });

    // Process the message and get the assistant's response
    const assistantMessage = await ChatService.processUserMessage(userMessage);

    // Update the state with the final assistant message
    set((state) => ({
      messages: [...state.messages, assistantMessage],
      isAssistantLoading: false,
    }));
  },
}));
