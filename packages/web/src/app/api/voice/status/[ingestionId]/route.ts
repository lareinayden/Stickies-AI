/**
 * GET /api/voice/status/:ingestionId
 * Get transcription status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTranscriptionByIngestionId } from '@/lib/db/transcriptions';
import { requireAuth } from '@/lib/auth/middleware';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { ingestionId: string } }
) {
  try {
    // Get authenticated user
    const userId = await requireAuth(request);
    
    const { ingestionId } = params;

    if (!ingestionId) {
      return NextResponse.json(
        { error: 'Ingestion ID is required' },
        { status: 400 }
      );
    }

    const transcription = await getTranscriptionByIngestionId(userId, ingestionId);

    if (!transcription) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ingestionId: transcription.ingestion_id,
      status: transcription.status,
      createdAt: transcription.created_at.toISOString(),
      completedAt: transcription.completed_at?.toISOString() || null,
      errorMessage: transcription.error_message || null,
      metadata: {
        originalFilename: transcription.original_filename,
        fileSize: transcription.file_size,
        durationSeconds: transcription.duration_seconds,
        audioFormat: transcription.audio_format,
        language: transcription.language,
      },
    });
  } catch (error) {
    console.error('Status check error:', error);
    
    // Handle authentication errors
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
            : 'An error occurred while checking status',
      },
      { status: 500 }
    );
  }
}
