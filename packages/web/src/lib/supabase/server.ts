/**
 * Supabase server client for API routes and server components.
 * Uses cookies for session (Next.js) and can validate JWT from Authorization header.
 */

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Create Supabase client that reads/writes session via Next.js cookies.
 * Use in Server Components, Route Handlers, and Middleware.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(url!, anonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from Server Component; ignore
        }
      },
    },
  });
}

/**
 * Get current user from server session (cookies).
 * Returns null if not authenticated or Supabase not configured.
 */
export async function getServerSessionUser() {
  if (!url || !anonKey) return null;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/** Admin client for JWT validation only (no cookies). */
function getSupabaseAdmin() {
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}

/**
 * Validate Supabase JWT and return user id if valid.
 * Use for API routes when client sends Authorization: Bearer <jwt>.
 */
export async function getUserIdFromSupabaseJwt(
  jwt: string | null
): Promise<string | null> {
  if (!jwt?.trim()) return null;
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(jwt);
  if (error || !user) return null;
  return user.id;
}
