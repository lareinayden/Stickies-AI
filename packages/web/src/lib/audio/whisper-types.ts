/**
 * Types for Whisper API integration
 */

export interface WhisperTranscriptionOptions {
  language?: string; // ISO 639-1 language code (e.g., 'en', 'es', 'fr')
  prompt?: string; // Optional text to guide the model's style
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  temperature?: number; // 0-1, controls randomness (default: 0)
  timestampGranularities?: ('word' | 'segment')[]; // For verbose_json format
}

export interface WhisperTranslationOptions extends WhisperTranscriptionOptions {
  // Translation uses same options as transcription
}

export interface WhisperSegment {
  id: number;
  seek: number; // Start time in seconds
  start: number; // Start time in seconds
  end: number; // End time in seconds
  text: string; // Transcribed text
  tokens: number[]; // Token IDs
  temperature: number;
  avgLogprob: number; // Average log probability
  compressionRatio: number;
  noSpeechProb: number; // Probability of no speech
}

export interface WhisperWord {
  word: string;
  start: number; // Start time in seconds
  end: number; // End time in seconds
  probability?: number; // Word-level confidence (if available)
}

export interface WhisperTranscriptionResult {
  text: string; // Full transcription text
  language?: string; // Detected language code
  duration?: number; // Audio duration in seconds
  segments?: WhisperSegment[]; // Detailed segments (if verbose_json)
  words?: WhisperWord[]; // Word-level timestamps (if word timestamps requested)
  confidence?: number; // Overall confidence score (calculated from segments)
}

export interface WhisperError extends Error {
  statusCode?: number;
  code?: string;
  retryable?: boolean; // Whether the error is retryable
}
