// src/services/DatabaseService.ts

import db from './database';
import { v4 as uuidv4 } from 'uuid'; // Ensure you have installed uuid

// --- TYPE DEFINITIONS ---
// Defining our data structures centrally provides a single source of truth.
export interface ChatSession {
  id: string;
  title: string;
  created_at: number;
}

export interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: Record<string, any>; // Use a flexible object for metadata
}

// --- CORE OPERATIONS ---

/**
 * Creates a new chat session in the database.
 * @param title The initial title for the chat session.
 * @returns The newly created ChatSession object.
 */
export const createNewSession = async (title: string): Promise<ChatSession> => {
  const newSession: ChatSession = {
    id: uuidv4(),
    title,
    created_at: Date.now(),
  };
  await db.runAsync(
    'INSERT INTO ChatSessions (id, title, created_at) VALUES (?, ?, ?)',
    newSession.id,
    newSession.title,
    newSession.created_at
  );
  return newSession;
};

/**
 * Retrieves all chat sessions, ordered by the most recently created.
 * @returns A promise that resolves to an array of ChatSession objects.
 */
export const getAllSessions = async (): Promise<ChatSession[]> => {
  return await db.getAllAsync<ChatSession>('SELECT * FROM ChatSessions ORDER BY created_at DESC');
};

/**
 * Adds a new message to a specific chat session.
 * @param messageData The message data, excluding the ID.
 * @returns The complete message object, including its new ID.
 */
export const addMessage = async (messageData: Omit<Message, 'id'>): Promise<Message> => {
  const newMessage: Message = {
    ...messageData,
    id: uuidv4(),
  };
  await db.runAsync(
    'INSERT INTO Messages (id, session_id, role, content, timestamp, metadata) VALUES (?, ?, ?, ?, ?, ?)',
    newMessage.id,
    newMessage.session_id,
    newMessage.role,
    newMessage.content,
    newMessage.timestamp,
    newMessage.metadata ? JSON.stringify(newMessage.metadata) : null
  );
  return newMessage;
};

/**
 * Retrieves all messages for a given session, ordered chronologically.
 * @param sessionId The ID of the session to retrieve messages for.
 * @returns A promise that resolves to an array of Message objects.
 */
export const getMessagesForSession = async (sessionId: string): Promise<Message[]> => {
  const results = await db.getAllAsync<any>(
    'SELECT * FROM Messages WHERE session_id = ? ORDER BY timestamp ASC',
    sessionId
  );

  // Parse metadata from JSON string back into an object
  return results.map((msg) => ({
    ...msg,
    metadata: msg.metadata ? JSON.parse(msg.metadata) : undefined,
  }));
};

/**
 * Deletes a chat session and all its associated messages.
 * @param sessionId The ID of the session to delete.
 */
export const deleteSession = async (sessionId: string): Promise<void> => {
  await db.runAsync('DELETE FROM ChatSessions WHERE id = ?', sessionId);
  // Messages are deleted automatically due to the ON DELETE CASCADE constraint.
};
