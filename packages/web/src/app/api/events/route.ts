import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { createEvent, createStickyReviewedEvent } from '@/lib/db/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type StickyReviewStatus = 'needs_review' | 'learned';

type EventPayload =
  | {
      event_type: 'sticky_reviewed';
      metadata: {
        stickyId: string;
        domain?: string | null;
        status: StickyReviewStatus;
      };
    }
  | {
      event_type: string;
      metadata?: Record<string, unknown> | null;
    };

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth(request);
    const body = (await request.json()) as EventPayload;

    if (!body.event_type || typeof body.event_type !== 'string') {
      return NextResponse.json(
        { error: 'event_type is required' },
        { status: 400 }
      );
    }

    if (body.event_type === 'sticky_reviewed') {
      const meta = body.metadata;
      if (
        !meta ||
        typeof meta.stickyId !== 'string' ||
        (meta.status !== 'needs_review' && meta.status !== 'learned')
      ) {
        return NextResponse.json(
          {
            error:
              'metadata.stickyId (string) and metadata.status (needs_review|learned) are required for sticky_reviewed',
          },
          { status: 400 }
        );
      }

      const event = await createStickyReviewedEvent(userId, {
        stickyId: meta.stickyId,
        domain: meta.domain ?? null,
        status: meta.status,
      });

      return NextResponse.json(
        {
          id: event.id,
          eventType: event.event_type,
          occurredAt: event.occurred_at.toISOString(),
        },
        { status: 201 }
      );
    }

    const event = await createEvent(userId, body.event_type, body.metadata);

    return NextResponse.json(
      {
        id: event.id,
        eventType: event.event_type,
        occurredAt: event.occurred_at.toISOString(),
      },
      { status: 201 }
    );
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
            : 'Failed to record event',
      },
      { status: 500 }
    );
  }
}

