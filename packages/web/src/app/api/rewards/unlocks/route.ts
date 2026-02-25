import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getUserUnlocks } from '@/lib/db/unlocks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth(request);
    const unlocks = await getUserUnlocks(userId);

    return NextResponse.json({
      unlocks: unlocks.map((u) => ({
        id: u.id,
        type: u.unlock_type,
        isEnabled: u.is_enabled,
        earnedAt: u.earned_at.toISOString(),
        metadata: u.metadata,
      })),
    });
  } catch (error) {
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
            : 'Failed to load rewards unlocks',
      },
      { status: 500 }
    );
  }
}

