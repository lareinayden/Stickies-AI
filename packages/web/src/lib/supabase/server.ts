/**
 * Supabase server utilities for API routes
 * Validates JWT from Authorization header (web + iOS)
 */

import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Validate Supabase JWT and return user id if valid
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
