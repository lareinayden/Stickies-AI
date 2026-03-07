/**
 * GET /api/rewards/productivity
 *
 * Returns productivity profile: peak window, adaptive notification time, and
 * personalized insight for the Rewards tab. All derived from events.occurred_at
 * (last 14 days).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getProductivityProfile } from '@/lib/db/productivity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LOOKBACK_DAYS = 14;

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth(request);

    const profile = await getProductivityProfile(userId, LOOKBACK_DAYS);

    return NextResponse.json({
      peakWindow: profile.peakWindow
        ? {
            startHour: profile.peakWindow.startHour,
            endHour: profile.peakWindow.endHour,
            label: profile.peakWindow.label,
            activityCount: profile.peakWindow.activityCount,
            notificationHour: profile.peakWindow.notificationHour,
            notificationMinute: profile.peakWindow.notificationMinute,
          }
        : null,
      insight: profile.insight,
      activityByHour: profile.activityByHour,
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
            : 'Failed to load productivity profile',
      },
      { status: 500 }
    );
  }
}
