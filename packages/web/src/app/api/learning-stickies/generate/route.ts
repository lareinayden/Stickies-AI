/**
 * POST /api/learning-stickies/generate
 * User provides a domain (area of interest); LLM generates learning stickies for that domain
 * and stores them. Returns the created stickies.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { createLearningStickiesGenerator } from '@/lib/llm/learning-stickies-generator';
import { createLearningStickiesForDomain, getDomains } from '@/lib/db/learning-stickies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth(request);

    const body = await request.json().catch(() => ({}));
    const domain =
      typeof body.domain === 'string' ? body.domain.trim() : '';
    const refine =
      typeof body.refine === 'string' ? body.refine.trim() : '';

    if (!domain) {
      return NextResponse.json(
        { error: 'Request body must include "domain": a string describing your area of interest (e.g. "React hooks", "machine learning", "quantum physics").' },
        { status: 400 }
      );
    }

    // For "refine": send domain + refinement prompt to LLM but store new stickies under same domain.
    // For new area: LLM returns a short areaSummary; we store under that, not the raw user prompt.
    const llmPrompt = refine ? `${domain}. ${refine}` : domain;

    const generator = createLearningStickiesGenerator();
    const { areaSummary, learningStickies: stickies } = await generator.generateForDomain(llmPrompt);

    if (stickies.length === 0) {
      return NextResponse.json({
        domain: refine ? domain : areaSummary,
        learningStickiesCreated: 0,
        learningStickies: [],
        message: 'No concepts were generated for this domain.',
      });
    }

    let storeDomain = refine ? domain : areaSummary;
    if (!refine) {
      const existing = await getDomains(userId);
      const existingNames = existing.map((d) => d.domain);
      const similar = await generator.findSimilarDomain(areaSummary, existingNames);
      if (similar) storeDomain = similar;
    }
    const created = await createLearningStickiesForDomain(userId, storeDomain, stickies);

    return NextResponse.json({
      domain: storeDomain,
      learningStickiesCreated: created.length,
      learningStickies: created.map((s) => ({
        id: s.id,
        concept: s.concept,
        definition: s.definition,
        example: s.example,
        relatedTerms: s.related_terms,
        domain: s.domain,
        createdAt: s.created_at.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Learning stickies generate error:', error);
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
            : 'An error occurred while generating learning stickies',
      },
      { status: 500 }
    );
  }
}
