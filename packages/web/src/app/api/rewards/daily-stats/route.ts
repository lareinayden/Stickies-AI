import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import {
  aggregateDailyStatsForUserOnDate,
  getDailyStatsForUserInRange,
} from '@/lib/db/daily-stats';

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
    const search = request.nextUrl.searchParams;

    const daysParam = search.get('days');
    let days = Number.isFinite(Number(daysParam)) ? parseInt(daysParam || '', 10) : 30;
    if (!Number.isFinite(days) || days <= 0 || days > 365) {
      days = 30;
    }

    const today = new Date();
    const start = addDays(new Date(today), -(days - 1));

    // For now, compute daily_stats on read for each day with streak disabled.
    const dates: Date[] = [];
    for (let i = 0; i < days; i += 1) {
      const d = addDays(start, i);
      dates.push(d);
    }

    // Sequential aggregation is fine for small ranges (<= 365 days)
    for (const date of dates) {
      // We pass streakMaintained=false for now; streak engine will update this later.
      // This still records effort from tasks/reviews for the heatmap.
      // eslint-disable-next-line no-await-in-loop
      await aggregateDailyStatsForUserOnDate(userId, date, {
        streakMaintained: false,
      });
    }

    const stats = await getDailyStatsForUserInRange(userId, start, today);

    return NextResponse.json({
      days,
      stats: stats.map((s) => ({
        date: s.date.toISOString().slice(0, 10),
        effortScore: s.effort_score,
        tasksCompleted: s.tasks_completed,
        reviewsCompleted: s.reviews_completed,
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
            : 'Failed to load rewards daily stats',
      },
      { status: 500 }
    );
  }
}

