// Web placeholder - no SQLite on web for now
export class DatabaseService {
  async initializeDatabase(): Promise<void> {
    console.log('📱 Database not available on web - mobile only feature');
  }

  async testConnection(): Promise<boolean> {
    console.log('📱 Database test skipped on web');
    return true; // Return success to avoid errors
  }

  async closeDatabase(): Promise<void> {
    console.log('📱 Database close skipped on web');
  }
}

export const databaseService = new DatabaseService();
