import * as SQLite from 'expo-sqlite';

export class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private readonly DB_NAME = 'praxis.db';
  private initialized = false;

  async initializeDatabase(): Promise<void> {
    if (this.initialized) return;
    
    try {
      this.db = await SQLite.openDatabaseAsync(this.DB_NAME);
      await this.createTables();
      this.initialized = true;
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      this.initialized = false;
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Chat conversations table
      const createChatsTable = `
        CREATE TABLE IF NOT EXISTS chats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL DEFAULT 'New Chat',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `;

      // Individual messages table
      const createMessagesTable = `
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chat_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (chat_id) REFERENCES chats (id) ON DELETE CASCADE
        );
      `;

      // Admin logs table
      const createAdminLogsTable = `
        CREATE TABLE IF NOT EXISTS admin_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action TEXT NOT NULL,
          details TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `;

      // App settings table
      const createSettingsTable = `
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `;

      await this.db.execAsync(createChatsTable);
      await this.db.execAsync(createMessagesTable);
      await this.db.execAsync(createAdminLogsTable);
      await this.db.execAsync(createSettingsTable);
      
      // Insert default settings
      await this.insertDefaultSettings();
      
      console.log('✅ All tables created successfully');
    } catch (error) {
      console.error('❌ Table creation failed:', error);
      throw error;
    }
  }

  private async insertDefaultSettings(): Promise<void> {
    const defaultSettings = [
      ['model_name', 'GPT4All (Not loaded)'],
      ['offline_mode', 'true'],
      ['admin_authenticated', 'false'],
    ];

    try {
      for (const [key, value] of defaultSettings) {
        await this.db!.runAsync(
          'INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)',
          [key, value]
        );
      }
    } catch (error) {
      console.error('❌ Default settings insertion failed:', error);
      throw error;
    }
  }

  // Chat operations
  async createNewChat(title: string = 'New Chat'): Promise<number> {
    if (!this.initialized) await this.initializeDatabase();
    
    const result = await this.db!.runAsync(
      'INSERT INTO chats (title) VALUES (?)',
      [title]
    );
    
    console.log('✅ New chat created:', result.lastInsertRowId);
    return result.lastInsertRowId!;
  }

  async addMessage(chatId: number, content: string, role: 'user' | 'assistant'): Promise<void> {
    if (!this.initialized) await this.initializeDatabase();
    
    await this.db!.runAsync(
      'INSERT INTO messages (chat_id, content, role) VALUES (?, ?, ?)',
      [chatId, content, role]
    );

    // Update chat timestamp
    await this.db!.runAsync(
      'UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [chatId]
    );
    
    console.log('✅ Message added to chat:', chatId);
  }

  async getChatMessages(chatId: number): Promise<any[]> {
    if (!this.initialized) await this.initializeDatabase();
    
    const messages = await this.db!.getAllAsync(
      'SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC',
      [chatId]
    );
    
    return messages;
  }

  async getAllChats(): Promise<any[]> {
    if (!this.initialized) await this.initializeDatabase();
    
    const chats = await this.db!.getAllAsync(
      'SELECT * FROM chats ORDER BY updated_at DESC'
    );
    
    return chats;
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.initialized) {
        await this.initializeDatabase();
      }
      
      // Test chat creation
      const chatId = await this.createNewChat('Test Chat');
      
      // Test message adding
      await this.addMessage(chatId, 'Hello, test message!', 'user');
      await this.addMessage(chatId, 'Hello! How can I help you today?', 'assistant');
      
      // Test message retrieval
      const messages = await this.getChatMessages(chatId);
      
      console.log('✅ Database test successful - Chat created with', messages.length, 'messages');
      return true;
    } catch (error) {
      console.error('❌ Database test failed:', error);
      return false;
    }
  }

  async closeDatabase(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      this.initialized = false;
      console.log('✅ Database closed');
    }
  }
}

export const databaseService = new DatabaseService();
