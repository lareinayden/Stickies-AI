/**
 * GET /api/voice/transcript/:ingestionId
 * Get transcription result
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTranscriptionByIngestionId } from '@/lib/db/transcriptions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { ingestionId: string } }
) {
  try {
    const { ingestionId } = params;

    if (!ingestionId) {
      return NextResponse.json(
        { error: 'Ingestion ID is required' },
        { status: 400 }
      );
    }

    const transcription = await getTranscriptionByIngestionId(ingestionId);

    if (!transcription) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 }
      );
    }

    // If still processing, return 202
    if (transcription.status === 'pending' || transcription.status === 'processing') {
      return NextResponse.json(
        {
          ingestionId: transcription.ingestion_id,
          status: transcription.status,
          message: 'Transcription is still being processed',
        },
        { status: 202 }
      );
    }

    // If failed, return error
    if (transcription.status === 'failed') {
      return NextResponse.json(
        {
          ingestionId: transcription.ingestion_id,
          status: 'failed',
          error: transcription.error_message || 'Transcription failed',
        },
        { status: 500 }
      );
    }

    // Return completed transcription
    return NextResponse.json({
      ingestionId: transcription.ingestion_id,
      status: transcription.status,
      transcript: transcription.transcript,
      language: transcription.language,
      segments: transcription.segments,
      confidenceScores: transcription.confidence_scores,
      metadata: {
        originalFilename: transcription.original_filename,
        fileSize: transcription.file_size,
        durationSeconds: transcription.duration_seconds,
        audioFormat: transcription.audio_format,
        createdAt: transcription.created_at.toISOString(),
        completedAt: transcription.completed_at?.toISOString(),
        additionalMetadata: transcription.metadata,
      },
    });
  } catch (error) {
    console.error('Transcript retrieval error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An error occurred while retrieving transcript',
      },
      { status: 500 }
    );
  }
}
