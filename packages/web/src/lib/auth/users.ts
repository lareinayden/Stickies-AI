/**
 * Mock user management for Option 1 (Simple Mock Authentication)
 * 
 * These are hardcoded test users. In Option 2, these will be replaced
 * with database-backed user accounts.
 */

export interface TestUser {
  id: string;
  username: string;
  displayName: string;
}

/**
 * Hardcoded test users
 */
export const TEST_USERS: TestUser[] = [
  {
    id: 'shirley',
    username: 'shirley',
    displayName: 'Shirley',
  },
  {
    id: 'yixiao',
    username: 'yixiao',
    displayName: 'Yixiao',
  },
  {
    id: 'guest',
    username: 'guest',
    displayName: 'Guest',
  },
];

/**
 * Get user by ID
 */
export function getUserById(userId: string): TestUser | null {
  return TEST_USERS.find((user) => user.id === userId) || null;
}

/**
 * Get user by username
 */
export function getUserByUsername(username: string): TestUser | null {
  return TEST_USERS.find((user) => user.username === username) || null;
}

/**
 * Get all users
 */
export function getAllUsers(): TestUser[] {
  return TEST_USERS;
}

/**
 * Validate user ID exists
 */
export function isValidUserId(userId: string): boolean {
  return TEST_USERS.some((user) => user.id === userId);
}
