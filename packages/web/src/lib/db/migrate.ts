/**
 * Run migrations only (e.g. add user_id to tasks/transcriptions).
 * Use when the tables exist but migrations were added later.
 *
 * Run: npm run db:migrate
 */

import 'dotenv/config';
import { getDbPool, closeDbPool } from './client';
import {
  MIGRATE_TRANSCRIPTIONS_USER_ID,
  MIGRATE_TASKS_USER_ID,
  LEARNING_STICKIES_TABLE_SCHEMA,
  MIGRATE_LEARNING_STICKIES_USER_ID,
  MIGRATE_LEARNING_STICKIES_DOMAIN,
} from './schema';

async function migrate() {
  const db = getDbPool();
  console.log('Running migrations...');

  await db.query(LEARNING_STICKIES_TABLE_SCHEMA);
  console.log('  ✓ learning_stickies table');

  await db.query(MIGRATE_TRANSCRIPTIONS_USER_ID);
  console.log('  ✓ transcriptions.user_id');

  await db.query(MIGRATE_TASKS_USER_ID);
  console.log('  ✓ tasks.user_id');

  await db.query(MIGRATE_LEARNING_STICKIES_USER_ID);
  console.log('  ✓ learning_stickies.user_id');

  await db.query(MIGRATE_LEARNING_STICKIES_DOMAIN);
  console.log('  ✓ learning_stickies.domain');

  await closeDbPool();
  console.log('Migrations complete.');
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
