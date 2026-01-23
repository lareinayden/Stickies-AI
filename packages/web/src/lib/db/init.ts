/**
 * Database initialization script
 * Can be run standalone or imported for programmatic initialization
 */

import 'dotenv/config';
import { initializeDatabase, testConnection, closeDbPool } from './client';

/**
 * Initialize database and verify connection
 */
export async function initDatabase(): Promise<void> {
  try {
    console.log('Testing database connection...');
    const isConnected = await testConnection();
    
    if (!isConnected) {
      throw new Error('Database connection test failed');
    }
    
    console.log('Database connection successful');
    console.log('Initializing database schema...');
    
    await initializeDatabase();
    
    console.log('Database initialization complete');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  } finally {
    await closeDbPool();
  }
}

// Allow running as standalone script
// This will work when run with tsx or ts-node
if (import.meta.url === `file://${process.argv[1]}` || require.main === module) {
  initDatabase()
    .then(() => {
      console.log('Done');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}
