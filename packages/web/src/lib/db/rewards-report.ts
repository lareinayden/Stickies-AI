import { getDbPool } from './client';
import { getDailyStatsForUserInRange } from './daily-stats';

export interface WeeklyReport {
  startDate: Date;
  endDate: Date;
  days: number;
  activeDays: number;
  totalTasks: number;
  totalReviews: number;
  averageEffort: number;
  bestDay: { date: Date; effortScore: number } | null;
}

function startOfUtcDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function getWeeklyReport(
  userId: string,
  endDate: Date
): Promise<WeeklyReport> {
  const end = startOfUtcDay(endDate);
  const start = startOfUtcDay(addDays(end, -6)); // last 7 days inclusive

  const stats = await getDailyStatsForUserInRange(userId, start, end);

  const days = 7;
  let activeDays = 0;
  let totalTasks = 0;
  let totalReviews = 0;
  let effortSum = 0;

  let bestDay: { date: Date; effortScore: number } | null = null;

  for (const s of stats) {
    const effort = s.effort_score;
    if (effort > 0) {
      activeDays += 1;
    }
    totalTasks += s.tasks_completed;
    totalReviews += s.reviews_completed;
    effortSum += effort;

    if (!bestDay || effort > bestDay.effortScore) {
      bestDay = { date: s.date, effortScore: effort };
    }
  }

  const averageEffort = days > 0 ? effortSum / days : 0;

  return {
    startDate: start,
    endDate: end,
    days,
    activeDays,
    totalTasks,
    totalReviews,
    averageEffort,
    bestDay,
  };
}

