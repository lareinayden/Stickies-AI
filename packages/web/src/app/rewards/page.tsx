type DailyStat = {
  date: string; // YYYY-MM-DD
  effortScore: number;
  tasksCompleted: number;
  reviewsCompleted: number;
};

import { requireAuth } from '@/lib/auth/middleware';
import {
  aggregateDailyStatsForUserOnDate,
  getDailyStatsForUserInRange,
} from '@/lib/db/daily-stats';
import { getWeeklyReport } from '@/lib/db/rewards-report';

function effortLevel(score: number): number {
  if (score <= 0) return 0;
  if (score < 3) return 1;
  if (score < 7) return 2;
  return 3;
}

function levelClass(level: number): string {
  switch (level) {
    case 0:
      return 'bg-slate-800';
    case 1:
      return 'bg-emerald-900';
    case 2:
      return 'bg-emerald-700';
    case 3:
    default:
      return 'bg-emerald-400';
  }
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toYyyyMmDd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

type WeeklyReport = {
  startDate: string;
  endDate: string;
  days: number;
  activeDays: number;
  totalTasks: number;
  totalReviews: number;
  averageEffort: number;
  bestDay: { date: string; effortScore: number } | null;
};

type Highlight =
  | {
      id: string;
      type: 'best_day';
      title: string;
      description: string;
      date: string;
      effortScore: number;
    }
  | {
      id: string;
      type: 'consistency';
      title: string;
      description: string;
      activeDays: number;
      totalDays: number;
    };

export default async function RewardsPage() {
  let userId: string | null = null;
  try {
    userId = await requireAuth();
  } catch (_) {
    userId = null;
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <header className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Effort Heatmap
            </h1>
            <p className="text-sm text-slate-400">
              Log in to view your rewards progress.
            </p>
          </header>
        </div>
      </main>
    );
  }

  const today = new Date();
  const days = 30;
  const start = addDays(new Date(today), -(days - 1));

  // Ensure daily_stats exists for each day we want to display.
  for (let i = 0; i < days; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await aggregateDailyStatsForUserOnDate(userId, addDays(start, i), {
      streakMaintained: false,
    });
  }

  const statsRows = await getDailyStatsForUserInRange(userId, start, today);
  const stats: DailyStat[] = statsRows.map((s) => ({
    date: toYyyyMmDd(s.date),
    effortScore: s.effort_score,
    tasksCompleted: s.tasks_completed,
    reviewsCompleted: s.reviews_completed,
  }));

  const weeklyRaw = await getWeeklyReport(userId, today);
  const weekly: WeeklyReport = {
    startDate: toYyyyMmDd(weeklyRaw.startDate),
    endDate: toYyyyMmDd(weeklyRaw.endDate),
    days: weeklyRaw.days,
    activeDays: weeklyRaw.activeDays,
    totalTasks: weeklyRaw.totalTasks,
    totalReviews: weeklyRaw.totalReviews,
    averageEffort: weeklyRaw.averageEffort,
    bestDay: weeklyRaw.bestDay
      ? { date: toYyyyMmDd(weeklyRaw.bestDay.date), effortScore: weeklyRaw.bestDay.effortScore }
      : null,
  };

  let bestDay = statsRows[0] ?? null;
  let activeDays = 0;
  for (const s of statsRows) {
    if (s.effort_score > 0) activeDays += 1;
    if (bestDay && s.effort_score > bestDay.effort_score) bestDay = s;
  }

  const highlights: Highlight[] =
    statsRows.length === 0
      ? []
      : ([
          {
            id: 'best-day',
            type: 'best_day',
            title: 'Highest effort day',
            description: 'Your most focused day in the last month.',
            date: toYyyyMmDd(bestDay!.date),
            effortScore: bestDay!.effort_score,
          },
          {
            id: 'consistency',
            type: 'consistency',
            title: 'Consistent effort',
            description: 'Days where you showed up and made progress.',
            activeDays,
            totalDays: statsRows.length,
          },
        ] as Highlight[]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Effort Heatmap
          </h1>
          <p className="text-sm text-slate-400">
            Last 30 days of effort. Darker greens mean more consistent work,
            not longer sessions.
          </p>
        </header>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          {stats.length === 0 ? (
            <p className="text-sm text-slate-400">
              No activity yet. Once you start completing tasks or reviewing
              learning stickies, your effort will appear here.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-7 gap-1">
                {stats.map((day) => {
                  const level = effortLevel(day.effortScore);
                  return (
                    <div
                      key={day.date}
                      className={`h-8 w-8 rounded-md ${levelClass(
                        level
                      )} relative group transition-colors`}
                    >
                      <div className="pointer-events-none absolute z-10 hidden w-56 rounded-md border border-slate-800 bg-slate-900/95 p-2 text-xs text-slate-100 shadow-lg group-hover:block">
                        <div className="font-medium">
                          {new Date(day.date).toLocaleDateString()}
                        </div>
                        <div className="mt-1 space-y-0.5 text-slate-300">
                          <div>Effort score: {day.effortScore.toFixed(1)}</div>
                          <div>Tasks: {day.tasksCompleted}</div>
                          <div>Reviews: {day.reviewsCompleted}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Lower effort</span>
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3].map((level) => (
                    <div
                      key={level}
                      className={`h-3 w-6 rounded-sm ${levelClass(level)}`}
                    />
                  ))}
                </div>
                <span>Higher effort</span>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <h2 className="text-sm font-medium text-slate-100">
            Weekly recap
          </h2>
          {!weekly ? (
            <p className="text-sm text-slate-400">
              No data yet for this week.
            </p>
          ) : (
            <div className="grid gap-3 text-sm text-slate-200 md:grid-cols-3">
              <div className="rounded-lg bg-slate-900/80 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Active days
                </div>
                <div className="mt-1 text-xl font-semibold">
                  {weekly.activeDays} / {weekly.days}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  From {weekly.startDate} to {weekly.endDate}
                </div>
              </div>
              <div className="rounded-lg bg-slate-900/80 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Tasks & reviews
                </div>
                <div className="mt-1 text-xl font-semibold">
                  {weekly.totalTasks} tasks
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {weekly.totalReviews} learning reviews
                </div>
              </div>
              <div className="rounded-lg bg-slate-900/80 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Average effort
                </div>
                <div className="mt-1 text-xl font-semibold">
                  {weekly.averageEffort.toFixed(1)}
                </div>
                {weekly.bestDay && (
                  <div className="mt-1 text-xs text-slate-500">
                    Best day: {weekly.bestDay.date} (
                    {weekly.bestDay.effortScore.toFixed(1)})
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <h2 className="text-sm font-medium text-slate-100">
            Highlights
          </h2>
          {highlights.length === 0 ? (
            <p className="text-sm text-slate-400">
              Highlights will appear here once you have a bit more activity.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {highlights.map((h) => (
                <div
                  key={h.id}
                  className="rounded-lg bg-slate-900/80 p-3 border border-slate-800"
                >
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    {h.type === 'best_day' ? 'Milestone' : 'Consistency'}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-100">
                    {h.title}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {h.description}
                  </div>
                  {h.type === 'best_day' && (
                    <div className="mt-2 text-xs text-slate-300">
                      {h.date} · Effort {h.effortScore.toFixed(1)}
                    </div>
                  )}
                  {h.type === 'consistency' && (
                    <div className="mt-2 text-xs text-slate-300">
                      Active {h.activeDays} of {h.totalDays} days
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

