/**
 * POST /api/auth/login
 * Sign in with email/password via Supabase
 * Client sends { email, password }; we validate with Supabase and set session cookie
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
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    const supabase = createClient(url, key);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(email).trim(),
      password: String(password),
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (!data.user?.id) {
      return NextResponse.json(
        { error: 'Login failed' },
        { status: 500 }
      );
    }

    // Set session cookie for server-side API routes
    const cookieStore = await cookies();
    cookieStore.set(USER_SESSION_COOKIE, data.user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email ?? undefined,
        displayName: data.user.user_metadata?.display_name ?? data.user.email?.split('@')[0] ?? 'User',
      },
      accessToken: data.session?.access_token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'An error occurred during login',
      },
      { status: 500 }
    );
  }
}
