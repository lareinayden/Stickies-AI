/**
 * POST /api/learning-stickies/combine
 * Combine multiple areas (domains) into one. All stickies from the given domains
 * are reassigned to newDomain. Body: { domains: string[], newDomain: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { updateStickiesDomains } from '@/lib/db/learning-stickies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth(request);

    const body = await request.json().catch(() => ({}));
    const domains = Array.isArray(body.domains)
      ? (body.domains as string[]).map((d) => (typeof d === 'string' ? d.trim() : '')).filter(Boolean);
    const newDomain = typeof body.newDomain === 'string' ? body.newDomain.trim() : '';

    if (domains.length < 2) {
      return NextResponse.json(
        { error: 'Request body must include "domains": an array of at least 2 area names to combine.' },
        { status: 400 }
      );
    }
    if (!newDomain) {
      return NextResponse.json(
        { error: 'Request body must include "newDomain": the name for the combined area.' },
        { status: 400 }
      );
    }

    const count = await updateStickiesDomains(userId, domains, newDomain);

    return NextResponse.json({
      combined: true,
      newDomain,
      stickiesMoved: count,
    });
  } catch (error) {
    console.error('Combine areas error:', error);
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to combine areas' },
      { status: 500 }
    );
  }
}
