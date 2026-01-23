/**
 * POST /api/voice/upload
 * Upload audio file for transcription
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { processAudioFile } from '@/lib/audio/processor';
import { validateAudioFile } from '@/lib/utils/file-validation';
import os from 'os';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Ensure upload directory exists
const uploadDir = join(os.tmpdir(), 'stickies-uploads');
if (!existsSync(uploadDir)) {
  mkdir(uploadDir, { recursive: true }).catch(() => {});
}

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const language = formData.get('language') as string | null;
    const translate = formData.get('translate') === 'true';
    const prompt = formData.get('prompt') as string | null;

    // Validate file
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Save file to temporary location
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempFilePath = join(uploadDir, `${Date.now()}_${file.name}`);
    await writeFile(tempFilePath, buffer);

    // Validate file
    const validation = await validateAudioFile(tempFilePath, file.name);
    if (!validation.valid) {
      // Clean up temp file
      await unlink(tempFilePath).catch(() => {});
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Process audio file (synchronously for MVP)
    const result = await processAudioFile(tempFilePath, file.name, {
      language: language || undefined,
      translate,
      prompt: prompt || undefined,
    });

    // Clean up uploaded file
    await unlink(tempFilePath).catch(() => {});

    if (result.status === 'failed') {
      return NextResponse.json(
        {
          ingestionId: result.ingestionId,
          status: 'failed',
          error: result.error,
        },
        { status: 500 }
      );
    }

    // Return ingestion ID immediately (for async processing in future)
    // For now, processing is synchronous, so status will be 'completed'
    return NextResponse.json({
      ingestionId: result.ingestionId,
      status: result.status,
      message:
        result.status === 'completed'
          ? 'Transcription completed successfully'
          : 'Transcription queued for processing',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An error occurred while processing the upload',
      },
      { status: 500 }
    );
  }
}
