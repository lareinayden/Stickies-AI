/**
 * Whisper API client for OpenAI transcription and translation
 */

import OpenAI from 'openai';
import { promises as fs } from 'fs';
import path from 'path';
import type {
  WhisperTranscriptionOptions,
  WhisperTranslationOptions,
  WhisperTranscriptionResult,
  WhisperError,
} from './whisper-types';

export interface WhisperClientConfig {
  apiKey: string;
  maxRetries?: number; // Maximum number of retry attempts (default: 3)
  retryDelay?: number; // Delay between retries in milliseconds (default: 1000)
  timeout?: number; // Request timeout in milliseconds (default: 60000)
}

export class WhisperClient {
  private client: OpenAI;
  private maxRetries: number;
  private retryDelay: number;
  private timeout: number;

  constructor(config: WhisperClientConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
      timeout: config.timeout || 60000, // 60 seconds default
    });

    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.timeout = config.timeout || 60000;
  }

  /**
   * Transcribe audio file using Whisper API
   */
  async transcribe(
    audioFilePath: string,
    options: WhisperTranscriptionOptions = {}
  ): Promise<WhisperTranscriptionResult> {
    const {
      language,
      prompt,
      responseFormat = 'verbose_json',
      temperature = 0,
      timestampGranularities = ['segment'],
    } = options;

    return this.executeWithRetry(async () => {
      // Read audio file as Buffer (Node.js environment)
      // OpenAI SDK accepts Buffer, File, or Blob
      const audioBuffer = await fs.readFile(audioFilePath);

      // Create File object for OpenAI API
      // File API is available in Node.js 18+
      // For older versions, we can pass Buffer directly
      let file: File | Buffer;
      try {
        // Try to use File API (Node.js 18+)
        file = new File([audioBuffer], path.basename(audioFilePath), {
          type: this.getMimeType(audioFilePath),
        });
      } catch {
        // Fallback to Buffer if File is not available
        file = audioBuffer;
      }

      // Call Whisper API
      const response = await this.client.audio.transcriptions.create({
        file: file as any, // OpenAI SDK accepts File | Blob | Buffer
        model: 'whisper-1',
        language: language || undefined,
        prompt: prompt || undefined,
        response_format: responseFormat,
        temperature,
        timestamp_granularities: timestampGranularities,
      });

      return this.parseTranscriptionResponse(response, responseFormat);
    });
  }

  /**
   * Translate audio file to English using Whisper API
   */
  async translate(
    audioFilePath: string,
    options: WhisperTranslationOptions = {}
  ): Promise<WhisperTranscriptionResult> {
    const {
      language,
      prompt,
      responseFormat = 'verbose_json',
      temperature = 0,
      timestampGranularities = ['segment'],
    } = options;

    return this.executeWithRetry(async () => {
      // Read audio file as Buffer (Node.js environment)
      const audioBuffer = await fs.readFile(audioFilePath);

      // Create File object for OpenAI API
      // File API is available in Node.js 18+
      // For older versions, we can pass Buffer directly
      let file: File | Buffer;
      try {
        // Try to use File API (Node.js 18+)
        file = new File([audioBuffer], path.basename(audioFilePath), {
          type: this.getMimeType(audioFilePath),
        });
      } catch {
        // Fallback to Buffer if File is not available
        file = audioBuffer;
      }

      // Call Whisper Translation API
      const response = await this.client.audio.translations.create({
        file: file as any, // OpenAI SDK accepts File | Blob | Buffer
        model: 'whisper-1',
        prompt: prompt || undefined,
        response_format: responseFormat,
        temperature,
        timestamp_granularities: timestampGranularities,
      });

      return this.parseTranscriptionResponse(response, responseFormat);
    });
  }

  /**
   * Parse transcription response based on format
   */
  private parseTranscriptionResponse(
    response: any,
    format: string
  ): WhisperTranscriptionResult {
    if (format === 'verbose_json') {
      // Response is already an object with detailed information
      const result: WhisperTranscriptionResult = {
        text: response.text || '',
        language: response.language,
        duration: response.duration,
        segments: response.segments?.map((seg: any) => ({
          id: seg.id,
          seek: seg.seek,
          start: seg.start,
          end: seg.end,
          text: seg.text,
          tokens: seg.tokens || [],
          temperature: seg.temperature,
          avgLogprob: seg.avgLogprob,
          compressionRatio: seg.compressionRatio,
          noSpeechProb: seg.noSpeechProb,
        })),
        words: response.words?.map((word: any) => ({
          word: word.word,
          start: word.start,
          end: word.end,
          probability: word.probability,
        })),
      };

      // Calculate overall confidence from segments
      if (result.segments && result.segments.length > 0) {
        const avgLogprobs = result.segments
          .map((seg) => seg.avgLogprob)
          .filter((prob) => !isNaN(prob));
        if (avgLogprobs.length > 0) {
          const avgLogprob =
            avgLogprobs.reduce((a, b) => a + b, 0) / avgLogprobs.length;
          // Convert log probability to confidence (0-1 scale)
          // Log probabilities are typically negative, so we normalize
          result.confidence = Math.max(0, Math.min(1, (avgLogprob + 1) / 2));
        }
      }

      return result;
    } else if (format === 'json') {
      // Simple JSON response with just text
      return {
        text: response.text || '',
        language: response.language,
      };
    } else {
      // Text, SRT, or VTT format - just return text
      return {
        text: typeof response === 'string' ? response : response.text || '',
      };
    }
  }

  /**
   * Execute API call with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      const whisperError = this.normalizeError(error);

      // Don't retry if:
      // - Max retries reached
      // - Error is not retryable
      // - Error is a client error (4xx) except rate limits
      if (
        attempt >= this.maxRetries ||
        !whisperError.retryable ||
        (whisperError.statusCode && whisperError.statusCode >= 400 && whisperError.statusCode < 500 && whisperError.statusCode !== 429)
      ) {
        throw whisperError;
      }

      // Calculate exponential backoff delay
      const delay = this.retryDelay * Math.pow(2, attempt - 1);

      // Wait before retrying
      await this.sleep(delay);

      // Retry
      return this.executeWithRetry(operation, attempt + 1);
    }
  }

  /**
   * Normalize error to WhisperError format
   */
  private normalizeError(error: any): WhisperError {
    const whisperError = error as WhisperError;

    // Check for rate limit errors
    if (error?.status === 429 || error?.statusCode === 429) {
      whisperError.statusCode = 429;
      whisperError.code = 'RATE_LIMIT_EXCEEDED';
      whisperError.retryable = true;
      return whisperError;
    }

    // Check for server errors (5xx) - retryable
    if (error?.status >= 500 || error?.statusCode >= 500) {
      whisperError.statusCode = error.status || error.statusCode;
      whisperError.code = 'SERVER_ERROR';
      whisperError.retryable = true;
      return whisperError;
    }

    // Check for network/timeout errors - retryable
    if (
      error?.code === 'ECONNRESET' ||
      error?.code === 'ETIMEDOUT' ||
      error?.code === 'ENOTFOUND' ||
      error?.message?.includes('timeout')
    ) {
      whisperError.code = error.code || 'NETWORK_ERROR';
      whisperError.retryable = true;
      return whisperError;
    }

    // Client errors (4xx) - generally not retryable
    if (error?.status >= 400 && error?.status < 500) {
      whisperError.statusCode = error.status || error.statusCode;
      whisperError.code = error.code || 'CLIENT_ERROR';
      whisperError.retryable = false;
      return whisperError;
    }

    // Default: make it a retryable error if we can't determine
    whisperError.statusCode = error?.status || error?.statusCode;
    whisperError.code = error?.code || 'UNKNOWN_ERROR';
    whisperError.retryable = true; // Default to retryable for unknown errors
    return whisperError;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.mp3': 'audio/mpeg',
      '.mp4': 'audio/mp4',
      '.mpeg': 'audio/mpeg',
      '.mpga': 'audio/mpeg',
      '.m4a': 'audio/mp4',
      '.wav': 'audio/wav',
      '.webm': 'audio/webm',
    };
    return mimeTypes[ext] || 'audio/mpeg';
  }

  /**
   * Check if API key is valid by making a test request
   */
  async validateApiKey(): Promise<boolean> {
    try {
      // Try to list models (lightweight operation)
      await this.client.models.list();
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Create a WhisperClient instance from environment variables
 */
export function createWhisperClient(): WhisperClient {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY environment variable is not set. Please set it in your .env file.'
    );
  }

  return new WhisperClient({
    apiKey,
    maxRetries: parseInt(process.env.WHISPER_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.WHISPER_RETRY_DELAY || '1000', 10),
    timeout: parseInt(process.env.WHISPER_TIMEOUT || '60000', 10),
  });
}
