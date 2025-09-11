import * as SQLite from 'expo-sqlite';
export * from './sqlite.native';

export class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private readonly DB_NAME = 'praxis.db';

  async initializeDatabase(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync(this.DB_NAME);
      await this.createTables();
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const createTestTable = `
      CREATE TABLE IF NOT EXISTS test_table (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await this.db.execAsync(createTestTable);
    console.log('✅ Test table created');
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.db) {
        await this.initializeDatabase();
      }
      
      // Insert test data
      const insertResult = await this.db!.runAsync(
        'INSERT INTO test_table (message) VALUES (?)',
        ['Database connection test']
      );
      
      console.log('✅ Insert successful, ID:', insertResult.lastInsertRowId);
      
      // Query test data
      const queryResult = await this.db!.getFirstAsync(
        'SELECT * FROM test_table ORDER BY id DESC LIMIT 1'
      );
      
      console.log('✅ Database test successful:', queryResult);
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
      console.log('✅ Database closed');
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
