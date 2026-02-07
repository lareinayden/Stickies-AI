/**
 * GET /api/learning-stickies
 * Get all learning stickies for the authenticated user.
 *
 * Query parameters:
 * - ingestionId: string (filter by ingestion)
 * - domain: string (filter by area of interest used to generate stickies)
 * - limit: number
 * - offset: number
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getLearningStickies,
  deleteLearningSticky,
  deleteLearningStickiesByDomain,
} from '@/lib/db/learning-stickies';
import { requireAuth } from '@/lib/auth/middleware';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireAuth(request);
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const domain = searchParams.get('domain');

    if (id) {
      const deleted = await deleteLearningSticky(userId, id);
      if (!deleted) {
        return NextResponse.json(
          { error: 'Sticky not found or already deleted' },
          { status: 404 }
        );
      }
      return NextResponse.json({ deleted: true, id });
    }

    if (domain) {
      const count = await deleteLearningStickiesByDomain(userId, domain);
      return NextResponse.json({ deleted: true, domain, count });
    }

    return NextResponse.json(
      { error: 'Provide query parameter id (delete one) or domain (delete area)' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Learning stickies delete error:', error);
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
            : 'An error occurred while deleting',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth(request);
    const searchParams = request.nextUrl.searchParams;

    const filters: {
      ingestionId?: string;
      domain?: string;
      limit?: number;
      offset?: number;
    } = {};

    if (searchParams.has('ingestionId')) {
      filters.ingestionId = searchParams.get('ingestionId') ?? undefined;
    }
    if (searchParams.has('domain')) {
      filters.domain = searchParams.get('domain') ?? undefined;
    }
    if (searchParams.has('limit')) {
      const limit = parseInt(searchParams.get('limit') || '0', 10);
      if (limit > 0) filters.limit = limit;
    }
    if (searchParams.has('offset')) {
      const offset = parseInt(searchParams.get('offset') || '0', 10);
      if (offset >= 0) filters.offset = offset;
    }

    const stickies = await getLearningStickies(userId, filters);

    return NextResponse.json({
      learningStickies: stickies.map((s) => ({
        id: s.id,
        transcriptionId: s.transcription_id,
        ingestionId: s.ingestion_id,
        domain: s.domain,
        concept: s.concept,
        definition: s.definition,
        example: s.example,
        relatedTerms: s.related_terms,
        createdAt: s.created_at.toISOString(),
        metadata: s.metadata,
      })),
      count: stickies.length,
    });
  } catch (error) {
    console.error('Learning stickies retrieval error:', error);
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
            : 'An error occurred while retrieving learning stickies',
      },
      { status: 500 }
    );
  }
}
