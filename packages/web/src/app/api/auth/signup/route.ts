/**
 * POST /api/auth/signup
 * Sign up with email/password via Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const USER_SESSION_COOKIE = 'stickies_ai_user_id';

export async function POST(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { email, password, displayName } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    const supabase = createClient(url, key);
    const { data, error } = await supabase.auth.signUp({
      email: String(email).trim(),
      password: String(password),
      options: {
        data: displayName ? { display_name: String(displayName).trim() } : undefined,
      },
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Sign up failed' },
        { status: 400 }
      );
    }

    if (!data.user?.id) {
      return NextResponse.json(
        { error: 'Sign up failed' },
        { status: 500 }
      );
    }

    // If session exists (e.g. email confirmation disabled), set cookie
    if (data.session) {
      const cookieStore = await cookies();
      cookieStore.set(USER_SESSION_COOKIE, data.user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email ?? undefined,
        displayName: data.user.user_metadata?.display_name ?? data.user.email?.split('@')[0] ?? 'User',
      },
      session: !!data.session,
      message: data.session
        ? undefined
        : 'Check your email to confirm your account',
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An error occurred during sign up',
      },
      { status: 500 }
    );
  }
}
