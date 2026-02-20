/**
 * GET  /api/learning-task-settings  – list all schedule settings for the user
 * POST /api/learning-task-settings  – create or update a domain's frequency setting
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import {
  getLearningTaskSettings,
  upsertLearningTaskSetting,
} from '@/lib/db/learning-task-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth(request);
    const settings = await getLearningTaskSettings(userId);
    return NextResponse.json({
      settings: settings.map((s) => ({
        id: s.id,
        domain: s.domain,
        frequencyDays: s.frequency_days,
        lastGeneratedAt: s.last_generated_at?.toISOString() ?? null,
        createdAt: s.created_at.toISOString(),
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth(request);
    const body = (await request.json()) as { domain?: unknown; frequencyDays?: unknown };

    if (typeof body.domain !== 'string' || !body.domain.trim()) {
      return NextResponse.json({ error: 'domain is required' }, { status: 400 });
    }
    if (typeof body.frequencyDays !== 'number' || body.frequencyDays < 0) {
      return NextResponse.json({ error: 'frequencyDays must be a non-negative number' }, { status: 400 });
    }

    const setting = await upsertLearningTaskSetting(userId, body.domain.trim(), body.frequencyDays);
    return NextResponse.json({
      setting: {
        id: setting.id,
        domain: setting.domain,
        frequencyDays: setting.frequency_days,
        lastGeneratedAt: setting.last_generated_at?.toISOString() ?? null,
        createdAt: setting.created_at.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save setting' },
      { status: 500 }
    );
  }
}
