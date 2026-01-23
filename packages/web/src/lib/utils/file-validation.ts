/**
 * File validation utilities for audio uploads
 */

import { promises as fs } from 'fs';
import { AudioNormalizer } from '../audio/normalizer';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  metadata?: {
    size: number;
    duration: number;
    format: string;
  };
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB (Whisper API limit)
const MAX_DURATION_SECONDS = 30; // 30 seconds max
const ALLOWED_FORMATS = ['wav', 'webm', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga'];

/**
 * Validate audio file
 */
export async function validateAudioFile(
  filePath: string,
  originalFilename: string
): Promise<ValidationResult> {
  try {
    // Check file exists
    const stats = await fs.stat(filePath);
    const fileSize = stats.size;

    // Check file size
    if (fileSize > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size (${(fileSize / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      };
    }

    if (fileSize === 0) {
      return {
        valid: false,
        error: 'File is empty',
      };
    }

    // Check file extension
    const ext = originalFilename
      .split('.')
      .pop()
      ?.toLowerCase();
    if (!ext || !ALLOWED_FORMATS.includes(ext)) {
      return {
        valid: false,
        error: `File format .${ext} is not supported. Allowed formats: ${ALLOWED_FORMATS.join(', ')}`,
      };
    }

    // Get audio metadata to check duration
    try {
      const normalizer = new AudioNormalizer();
      const metadata = await normalizer.getAudioMetadata(filePath);

      // Check duration
      if (metadata.duration > MAX_DURATION_SECONDS) {
        return {
          valid: false,
          error: `Audio duration (${metadata.duration.toFixed(1)}s) exceeds maximum allowed duration of ${MAX_DURATION_SECONDS}s`,
        };
      }

      return {
        valid: true,
        metadata: {
          size: fileSize,
          duration: metadata.duration,
          format: metadata.format,
        },
      };
    } catch (error) {
      return {
        valid: false,
        error: `Failed to read audio metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  } catch (error) {
    return {
      valid: false,
      error: `File validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Validate file MIME type from buffer (basic check)
 */
export function validateMimeType(mimeType: string): boolean {
  const allowedMimeTypes = [
    'audio/wav',
    'audio/webm',
    'audio/m4a',
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'video/mp4', // Some MP4 files contain audio
  ];

  return allowedMimeTypes.some((allowed) => mimeType.includes(allowed));
}
