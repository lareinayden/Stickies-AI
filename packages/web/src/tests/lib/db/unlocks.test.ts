/**
 * Unit tests for the unlocks engine.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeDatabase, closeDbPool, getDbPool } from '@/lib/db/client';
import { getUserUnlocks, getUnlock, ensureUnlock } from '@/lib/db/unlocks';

describe('Unlocks', () => {
  const userId = 'test-user-unlocks';

  beforeAll(async () => {
    await initializeDatabase();
  });

  afterAll(async () => {
    await closeDbPool();
  });

  beforeEach(async () => {
    const db = getDbPool();
    await db.query('DELETE FROM unlocks WHERE user_id = $1', [userId]);
  });

  it('creates and retrieves an unlock', async () => {
    const created = await ensureUnlock(userId, 'theme', { source: 'test' });

    expect(created.user_id).toBe(userId);
    expect(created.unlock_type).toBe('theme');
    expect(created.is_enabled).toBe(true);

    const fetched = await getUnlock(userId, 'theme');
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(created.id);

    const all = await getUserUnlocks(userId);
    expect(all).toHaveLength(1);
    expect(all[0].unlock_type).toBe('theme');
  });

  it('is idempotent when ensuring the same unlock', async () => {
    const first = await ensureUnlock(userId, 'theme', { source: 'first' });
    const second = await ensureUnlock(userId, 'theme', { source: 'second' });

    expect(second.id).toBe(first.id);

    const all = await getUserUnlocks(userId);
    expect(all).toHaveLength(1);
  });
});

