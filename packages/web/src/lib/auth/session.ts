/**
 * Simple session management for Option 1 (Mock Authentication)
 * 
 * Uses localStorage for client-side session storage.
 * In Option 2, this will be replaced with secure HTTP-only cookies.
 */

const USER_SESSION_KEY = 'stickies_ai_user_id';

/**
 * Get current user ID from session
 */
export function getCurrentUserId(): string | null {
  if (typeof window === 'undefined') {
    // Server-side: return null (will be handled by API routes via cookies/headers)
    return null;
  }
  return localStorage.getItem(USER_SESSION_KEY);
}

/**
 * Set current user ID in session
 */
export function setCurrentUserId(userId: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(USER_SESSION_KEY, userId);
}

/**
 * Clear current user session
 */
export function clearSession(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(USER_SESSION_KEY);
}

/**
 * Check if user is logged in
 */
export function isLoggedIn(): boolean {
  return getCurrentUserId() !== null;
}
