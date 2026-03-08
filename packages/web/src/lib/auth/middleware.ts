/**
 * Authentication middleware utilities.
 * Supports Supabase JWT (Bearer), cookie session (web), and optional mock users for dev.
 */

import { cookies } from 'next/headers';
import { getUserIdFromSupabaseJwt } from '@/lib/supabase/server';
import { isValidUserId } from './users';

const USER_SESSION_COOKIE = 'stickies_ai_user_id';
const ALLOW_MOCK_USERS = process.env.ALLOW_MOCK_USERS === 'true';

/**
 * Get user ID from request (server-side).
 * 1. Authorization: Bearer <jwt> — validate via Supabase, return user.id (UUID).
 * 2. Cookie (web) — USER_SESSION_COOKIE set after Supabase login (user id).
 * 3. X-User-Id header — only when ALLOW_MOCK_USERS=true (shirley, yixiao, guest).
 */
export async function getUserIdFromRequest(
  request?: Request
): Promise<string | null> {
  try {
    // 1. Prefer Bearer JWT (web client or iOS)
    if (request) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const userId = await getUserIdFromSupabaseJwt(token);
        if (userId) return userId;
      }
    }

    // 2. Cookie (set by web login/signup after Supabase auth)
    const cookieStore = await cookies();
    const cookieUserId = cookieStore.get(USER_SESSION_COOKIE)?.value;
    if (cookieUserId?.trim()) {
      // Trust cookie set by our auth routes (Supabase user id)
      if (cookieUserId.length === 36 && cookieUserId.includes('-')) {
        return cookieUserId; // UUID format
      }
      if (isValidUserId(cookieUserId)) return cookieUserId;
    }

    // 3. Dev fallback: X-User-Id with mock users
    if (ALLOW_MOCK_USERS && request) {
      const userIdHeader = request.headers.get('X-User-Id');
      if (userIdHeader && isValidUserId(userIdHeader)) return userIdHeader;
    }

    return null;
  } catch (error) {
    console.error('Error getting user ID from request:', error);
    return null;
  }
}

/**
 * Require authentication — throws if user not found.
 */
export async function requireAuth(request?: Request): Promise<string> {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    throw new Error('Authentication required');
  }
  return userId;
}
