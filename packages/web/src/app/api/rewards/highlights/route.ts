import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getDailyStatsForUserInRange } from '@/lib/db/daily-stats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth(request);

    const today = new Date();
    const start = addDays(new Date(today), -29);

    const stats = await getDailyStatsForUserInRange(userId, start, today);

    if (stats.length === 0) {
      return NextResponse.json({ highlights: [] });
    }

    let bestDay = stats[0];
    let activeDays = 0;

    for (const s of stats) {
      if (s.effort_score > 0) {
        activeDays += 1;
      }
      if (s.effort_score > bestDay.effort_score) {
        bestDay = s;
      }
    }

    const highlights = [];

    highlights.push({
      id: 'best-day',
      type: 'best_day',
      title: 'Highest effort day',
      description: 'Your most focused day in the last month.',
      date: bestDay.date.toISOString().slice(0, 10),
      effortScore: bestDay.effort_score,
    });

    highlights.push({
      id: 'consistency',
      type: 'consistency',
      title: 'Consistent effort',
      description: 'Days where you showed up and made progress.',
      activeDays,
      totalDays: stats.length,
    });

    return NextResponse.json({ highlights });
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
            : 'Failed to load rewards highlights',
      },
      { status: 500 }
    );
  }
}

