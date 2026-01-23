/**
 * Audio processing pipeline
 * Handles the full pipeline: normalize → transcribe → save to database
 */

import { AudioNormalizer } from './normalizer';
import { WhisperClient, createWhisperClient } from './whisper-client';
import {
  createTranscription,
  updateTranscriptionStatus,
  updateTranscriptionMetadata,
  completeTranscription,
  failTranscription,
} from '../db/transcriptions';
import { generateIngestionId } from '../utils/ingestion-id';
import { promises as fs } from 'fs';
import path from 'path';
import type { AudioMetadata } from './types';
import type { WhisperTranscriptionResult } from './whisper-types';

export interface ProcessingOptions {
  language?: string;
  translate?: boolean; // If true, translate to English instead of transcribing
  prompt?: string;
}

export interface ProcessingResult {
  ingestionId: string;
  status: 'completed' | 'failed';
  transcript?: string;
  language?: string;
  duration?: number;
  segments?: Array<{ start: number; end: number; text: string }>;
  confidence?: number;
  error?: string;
}

/**
 * Process audio file through the full pipeline
 */
export async function processAudioFile(
  audioFilePath: string,
  originalFilename: string,
  options: ProcessingOptions = {}
): Promise<ProcessingResult> {
  const ingestionId = generateIngestionId();
  let tempFiles: string[] = [];

  try {
    // Step 1: Create transcription record in database
    const fileStats = await fs.stat(audioFilePath);
    let transcription = await createTranscription(
      ingestionId,
      originalFilename,
      fileStats.size
    );

    // Step 2: Update status to processing
    transcription = await updateTranscriptionStatus(ingestionId, 'processing');

    // Step 3: Normalize audio
    const normalizer = new AudioNormalizer();
    const normalized = await normalizer.normalizeAudioOptimized(audioFilePath, {
      outputFormat: 'mp3',
      sampleRate: 16000,
      channels: 1,
      volumeNormalization: true,
    });
    tempFiles.push(normalized.outputPath);

    // Update metadata with audio info
    transcription = await updateTranscriptionMetadata(ingestionId, {
      durationSeconds: normalized.metadata.duration,
      audioFormat: normalized.metadata.format,
    });

    // Step 4: Transcribe or translate using Whisper API
    const whisperClient = createWhisperClient();
    let whisperResult: WhisperTranscriptionResult;

    if (options.translate) {
      whisperResult = await whisperClient.translate(normalized.outputPath, {
        prompt: options.prompt,
        responseFormat: 'verbose_json',
        timestampGranularities: ['segment'],
      });
    } else {
      whisperResult = await whisperClient.transcribe(normalized.outputPath, {
        language: options.language,
        prompt: options.prompt,
        responseFormat: 'verbose_json',
        timestampGranularities: ['segment'],
      });
    }

    // Step 5: Save transcription to database
    const segments = whisperResult.segments?.map((seg) => ({
      start: seg.start,
      end: seg.end,
      text: seg.text,
    }));

    const confidenceScores: Record<string, number> = {};
    if (whisperResult.confidence) {
      confidenceScores.overall = whisperResult.confidence;
    }

    transcription = await completeTranscription(
      ingestionId,
      whisperResult.text,
      segments || undefined,
      confidenceScores,
      {
        language: whisperResult.language,
        duration: whisperResult.duration,
        wordCount: whisperResult.text.split(/\s+/).length,
      }
    );

    // Cleanup temp files
    await normalizer.cleanupTempFiles(tempFiles);

    return {
      ingestionId,
      status: 'completed',
      transcript: whisperResult.text,
      language: whisperResult.language,
      duration: whisperResult.duration,
      segments,
      confidence: whisperResult.confidence,
    };
  } catch (error) {
    // Mark as failed in database
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    await failTranscription(ingestionId, errorMessage).catch(() => {
      // Ignore errors during failure recording
    });

    // Cleanup temp files on error
    if (tempFiles.length > 0) {
      const normalizer = new AudioNormalizer();
      await normalizer.cleanupTempFiles(tempFiles).catch(() => {
        // Ignore cleanup errors
      });
    }

    return {
      ingestionId,
      status: 'failed',
      error: errorMessage,
    };
  }
}
