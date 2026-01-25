/**
 * Authentication middleware utilities
 * 
 * For Option 1: Simple user ID extraction from cookies/localStorage
 * For Option 2: Will be replaced with proper JWT/session validation
 */

import { cookies } from 'next/headers';
import { isValidUserId } from './users';

const USER_SESSION_COOKIE = 'stickies_ai_user_id';

/**
 * Get user ID from request (server-side)
 * Checks cookies first, then falls back to headers
 */
export async function getUserIdFromRequest(
  request?: Request
): Promise<string | null> {
  try {
    // Try to get from cookie (preferred for server-side)
    const cookieStore = await cookies();
    const userId = cookieStore.get(USER_SESSION_COOKIE)?.value;

    if (userId && isValidUserId(userId)) {
      return userId;
    }

    // Fallback: try to get from Authorization header
    if (request) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        // In Option 2, this would validate a JWT token
        // For now, we'll just check if it's a valid user ID
        if (isValidUserId(token)) {
          return token;
        }
      }

      // Also check X-User-Id header (for client-side requests)
      const userIdHeader = request.headers.get('X-User-Id');
      if (userIdHeader && isValidUserId(userIdHeader)) {
        return userIdHeader;
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting user ID from request:', error);
    return null;
  }
}

/**
 * Require authentication - throws error if user not found
 */
export async function requireAuth(request?: Request): Promise<string> {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    throw new Error('Authentication required');
  }
  return userId;
}
