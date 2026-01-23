/**
 * Audio processing types and interfaces
 */

export interface AudioMetadata {
  duration: number; // Duration in seconds
  format: string; // Audio format (wav, mp3, m4a, webm, etc.)
  size: number; // File size in bytes
  sampleRate?: number; // Sample rate in Hz
  channels?: number; // Number of audio channels
  bitrate?: number; // Bitrate in kbps
}

export interface NormalizationOptions {
  outputFormat?: 'mp3' | 'wav';
  sampleRate?: number; // Default: 16000 (Whisper's native rate)
  channels?: number; // Default: 1 (mono)
  volumeNormalization?: boolean; // Default: true (peak normalization to -1dB)
  outputPath?: string; // Optional: specify output path, otherwise uses temp file
}

export interface NormalizationResult {
  outputPath: string;
  metadata: AudioMetadata;
  tempFiles: string[]; // List of temporary files created (for cleanup)
}
