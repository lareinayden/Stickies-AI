/**
 * GET /api/auth/session
 * Get current user session
 * 
 * POST /api/auth/session
 * Set user session (for server-side session management)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserById, isValidUserId } from '@/lib/auth/users';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const USER_SESSION_COOKIE = 'stickies_ai_user_id';

/**
 * GET - Get current user session
 */
export async function GET(request: NextRequest) {
  try {
    // Try to get user ID from cookie
    const cookieStore = await cookies();
    const userId = cookieStore.get(USER_SESSION_COOKIE)?.value;

    if (!userId || !isValidUserId(userId)) {
      return NextResponse.json({ user: null, loggedIn: false });
    }

    const user = getUserById(userId);
    if (!user) {
      return NextResponse.json({ user: null, loggedIn: false });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
      },
      loggedIn: true,
    });
  } catch (error) {
    console.error('Session retrieval error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An error occurred while retrieving session',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Set user session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId || !isValidUserId(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const user = getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Set cookie (for server-side access)
    const cookieStore = await cookies();
    cookieStore.set(USER_SESSION_COOKIE, userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
      },
    });
  } catch (error) {
    console.error('Session setting error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An error occurred while setting session',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Clear user session
 */
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(USER_SESSION_COOKIE);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session clearing error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An error occurred while clearing session',
      },
      { status: 500 }
    );
  }
}
