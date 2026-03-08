/**
 * GET /api/auth/session — Return current user from Supabase session (cookies).
 * POST /api/auth/session — Set server cookie with user id (after client-side Supabase sign-in).
 * DELETE /api/auth/session — Clear session cookie.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSessionUser } from '@/lib/supabase/server';
import { isValidUserId } from '@/lib/auth/users';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const USER_SESSION_COOKIE = 'stickies_ai_user_id';

/**
 * GET — Current user from Supabase session (cookie-based).
 */
export async function GET() {
  try {
    const user = await getServerSessionUser();
    if (user) {
      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email ?? undefined,
          displayName: user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? 'User',
        },
        loggedIn: true,
      });
    }
    // Fallback: cookie set by POST after client-side Supabase login
    const cookieStore = await cookies();
    const cookieUserId = cookieStore.get(USER_SESSION_COOKIE)?.value;
    if (cookieUserId) {
      return NextResponse.json({
        user: { id: cookieUserId, email: undefined, displayName: 'User' },
        loggedIn: true,
      });
    }
    return NextResponse.json({ user: null, loggedIn: false });
  } catch (error) {
    console.error('Session retrieval error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get session' },
      { status: 500 }
    );
  }
}

/**
 * POST — Set session cookie (used after client-side Supabase sign-in so API routes see the user).
 * Accepts { userId } (Supabase user id UUID or, in dev, mock user id).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }
    // Allow UUID (Supabase) or mock users when valid
    const isUuid = userId.length === 36 && userId.includes('-');
    if (!isUuid && !isValidUserId(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }
    const cookieStore = await cookies();
    cookieStore.set(USER_SESSION_COOKIE, userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    const displayName = isUuid ? 'User' : userId;
    return NextResponse.json({
      success: true,
      user: { id: userId, displayName },
    });
  } catch (error) {
    console.error('Session setting error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to set session' },
      { status: 500 }
    );
  }
}

/**
 * DELETE — Clear session cookie.
 */
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(USER_SESSION_COOKIE);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session clearing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clear session' },
      { status: 500 }
    );
  }
}
