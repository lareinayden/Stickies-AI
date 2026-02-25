import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getWeeklyReport } from '@/lib/db/rewards-report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth(request);
    const report = await getWeeklyReport(userId, new Date());

    return NextResponse.json({
      startDate: report.startDate.toISOString().slice(0, 10),
      endDate: report.endDate.toISOString().slice(0, 10),
      days: report.days,
      activeDays: report.activeDays,
      totalTasks: report.totalTasks,
      totalReviews: report.totalReviews,
      averageEffort: Number(report.averageEffort.toFixed(2)),
      bestDay: report.bestDay
        ? {
            date: report.bestDay.date.toISOString().slice(0, 10),
            effortScore: report.bestDay.effortScore,
          }
        : null,
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
            : 'Failed to load weekly report',
      },
      { status: 500 }
    );
  }
}

