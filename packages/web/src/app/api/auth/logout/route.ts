/**
 * POST /api/auth/logout
 * Clear server session cookie. Client should also call supabase.auth.signOut().
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const USER_SESSION_COOKIE = 'stickies_ai_user_id';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(USER_SESSION_COOKIE);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Logout failed' },
      { status: 500 }
    );
  }
}
