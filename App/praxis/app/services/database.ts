// src/services/database.ts

import * as SQLite from 'expo-sqlite';

// --- DATABASE SCHEMA ---
// We define the schema here as a constant for clarity and reusability.
const SCHEMA = `
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS ChatSessions (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS Messages (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    metadata TEXT, -- Stored as a JSON string
    FOREIGN KEY (session_id) REFERENCES ChatSessions (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS EventLog (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    timestamp INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    details TEXT -- Stored as a JSON string
  );
`;

/**
 * Opens a connection to the SQLite database.
 * This should be treated as a singleton across the app.
 */
const db = SQLite.openDatabaseSync('assistant.db');

/**
 * Initializes the database by executing the schema creation scripts.
 * This function is idempotent and can be safely called on every app startup.
 */
export const initDatabase = async () => {
  try {
    await db.execAsync(SCHEMA);
    console.log('[Database] Initialization successful.');
  } catch (error) {
    console.error('[Database] Initialization failed:', error);
    // Depending on the app's needs, you might want to handle this more gracefully
  }
};

export default db;
