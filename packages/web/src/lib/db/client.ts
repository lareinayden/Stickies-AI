/**
 * PostgreSQL database client with connection pooling
 */

import { Pool, PoolConfig } from 'pg';
import {
  TRANSCRIPTIONS_TABLE_SCHEMA,
  TASKS_TABLE_SCHEMA,
  MIGRATE_TRANSCRIPTIONS_USER_ID,
  MIGRATE_TASKS_USER_ID,
} from './schema';

let pool: Pool | null = null;

/**
 * Get database connection pool
 * Creates a new pool if one doesn't exist
 */
export function getDbPool(): Pool {
  if (pool) {
    return pool;
  }

  const config: PoolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'stickies_ai',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: parseInt(process.env.DB_POOL_MAX || '20', 10), // Maximum number of clients in the pool
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000', 10),
  };

  pool = new Pool(config);

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('Unexpected error on idle database client', err);
  });

  return pool;
}

/**
 * Initialize database schema
 * Creates the transcriptions and tasks tables if they don't exist
 * Runs migrations to add user_id columns if needed
 */
export async function initializeDatabase(): Promise<void> {
  const db = getDbPool();
  
  try {
    // Create tables if they don't exist
    await db.query(TRANSCRIPTIONS_TABLE_SCHEMA);
    await db.query(TASKS_TABLE_SCHEMA);
    
    // Run migrations to add user_id columns if they don't exist
    await db.query(MIGRATE_TRANSCRIPTIONS_USER_ID);
    await db.query(MIGRATE_TASKS_USER_ID);
    
    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database schema:', error);
    throw error;
  }
}

/**
 * Close database connection pool
 * Should be called when shutting down the application
 */
export async function closeDbPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  const db = getDbPool();
  
  try {
    const result = await db.query('SELECT NOW()');
    return result.rows.length > 0;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}
