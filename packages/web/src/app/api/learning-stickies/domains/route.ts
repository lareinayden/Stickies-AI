/**
 * GET /api/learning-stickies/domains
 * Returns distinct areas of interest (domains) for the authenticated user with count per domain.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDomains } from '@/lib/db/learning-stickies';
import { requireAuth } from '@/lib/auth/middleware';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth(request);
    const domains = await getDomains(userId);
    return NextResponse.json({ domains });
  } catch (error) {
    console.error('Learning stickies domains error:', error);
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An error occurred while fetching domains',
      },
      { status: 500 }
    );
  }
}
