/**
 * Audio normalization service using FFmpeg
 * Normalizes audio files for Whisper API compatibility
 */

import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type { AudioMetadata, NormalizationOptions, NormalizationResult } from './types';

// Ensure FFmpeg path is set (if installed via Homebrew on macOS)
if (process.platform === 'darwin') {
  const ffmpegPath = '/opt/homebrew/bin/ffmpeg';
  const ffprobePath = '/opt/homebrew/bin/ffprobe';
  try {
    // Try to set FFmpeg paths if they exist
    if (require('fs').existsSync(ffmpegPath)) {
      ffmpeg.setFfmpegPath(ffmpegPath);
    }
    if (require('fs').existsSync(ffprobePath)) {
      ffmpeg.setFfprobePath(ffprobePath);
    }
  } catch (error) {
    // FFmpeg paths not found, will use system PATH
    console.warn('FFmpeg paths not configured, using system PATH');
  }
}

export class AudioNormalizer {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'stickies-audio');
    // Ensure temp directory exists
    fs.mkdir(this.tempDir, { recursive: true }).catch(() => {
      // Directory might already exist, ignore error
    });
  }

  /**
   * Get audio metadata (duration, format, size, etc.)
   */
  async getAudioMetadata(inputPath: string): Promise<AudioMetadata> {
    return new Promise((resolve, reject) => {
      // Get file size
      fs.stat(inputPath)
        .then((stats) => {
          const fileSize = stats.size;

          // Get audio metadata using ffprobe
          ffmpeg.ffprobe(inputPath, (err, metadata) => {
            if (err) {
              reject(new Error(`Failed to probe audio file: ${err.message}`));
              return;
            }

            const format = metadata.format;
            const audioStream = metadata.streams.find(
              (stream) => stream.codec_type === 'audio'
            );

            if (!audioStream) {
              reject(new Error('No audio stream found in file'));
              return;
            }

            const result: AudioMetadata = {
              duration: format.duration || 0,
              format: format.format_name?.split(',')[0] || 'unknown',
              size: fileSize,
              sampleRate: audioStream.sample_rate
                ? parseInt(audioStream.sample_rate.toString(), 10)
                : undefined,
              channels: audioStream.channels,
              bitrate: format.bit_rate
                ? Math.round(parseInt(format.bit_rate.toString(), 10) / 1000)
                : undefined,
            };

            resolve(result);
          });
        })
        .catch(reject);
    });
  }

  /**
   * Normalize audio format (convert to mp3 or wav)
   */
  async normalizeFormat(
    inputPath: string,
    outputPath: string,
    targetFormat: 'mp3' | 'wav' = 'mp3'
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath);

      if (targetFormat === 'mp3') {
        command
          .format('mp3')
          .audioCodec('libmp3lame')
          .audioBitrate(128);
      } else {
        command.format('wav').audioCodec('pcm_s16le');
      }

      command
        .on('end', () => {
          resolve(outputPath);
        })
        .on('error', (err) => {
          reject(new Error(`Format normalization failed: ${err.message}`));
        })
        .save(outputPath);
    });
  }

  /**
   * Normalize sample rate (resample to target rate, default 16kHz)
   */
  async normalizeSampleRate(
    inputPath: string,
    outputPath: string,
    targetSampleRate: number = 16000
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioFrequency(targetSampleRate)
        .on('end', () => {
          resolve(outputPath);
        })
        .on('error', (err) => {
          reject(new Error(`Sample rate normalization failed: ${err.message}`));
        })
        .save(outputPath);
    });
  }

  /**
   * Normalize channels (convert to mono)
   */
  async normalizeChannels(
    inputPath: string,
    outputPath: string,
    targetChannels: number = 1
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioChannels(targetChannels)
        .on('end', () => {
          resolve(outputPath);
        })
        .on('error', (err) => {
          reject(new Error(`Channel normalization failed: ${err.message}`));
        })
        .save(outputPath);
    });
  }

  /**
   * Normalize volume (peak normalization to -1dB)
   */
  async normalizeVolume(
    inputPath: string,
    outputPath: string,
    targetLevel: number = -1.0
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // Use loudnorm filter for peak normalization
      // -1dB is a safe level that prevents clipping
      ffmpeg(inputPath)
        .audioFilters(`volume=${targetLevel}dB`)
        .on('end', () => {
          resolve(outputPath);
        })
        .on('error', (err) => {
          reject(new Error(`Volume normalization failed: ${err.message}`));
        })
        .save(outputPath);
    });
  }

  /**
   * Unified normalization method that chains all steps
   */
  async normalizeAudio(
    inputPath: string,
    options: NormalizationOptions = {}
  ): Promise<NormalizationResult> {
    const {
      outputFormat = 'mp3',
      sampleRate = 16000,
      channels = 1,
      volumeNormalization = true,
      outputPath: customOutputPath,
    } = options;

    const tempFiles: string[] = [];
    let currentPath = inputPath;

    try {
      // Get original metadata
      const originalMetadata = await this.getAudioMetadata(inputPath);

      // Step 1: Normalize format
      const formatOutputPath =
        customOutputPath ||
        path.join(
          this.tempDir,
          `format_${Date.now()}_${Math.random().toString(36).substring(7)}.${outputFormat}`
        );
      // Only add to temp files if it's not the final output path
      if (!customOutputPath && formatOutputPath !== inputPath) {
        tempFiles.push(formatOutputPath);
      }
      currentPath = await this.normalizeFormat(currentPath, formatOutputPath, outputFormat);

      // Step 2: Normalize sample rate (if needed)
      if (originalMetadata.sampleRate && originalMetadata.sampleRate !== sampleRate) {
        const sampleRateOutputPath =
          customOutputPath ||
          path.join(
            this.tempDir,
            `samplerate_${Date.now()}_${Math.random().toString(36).substring(7)}.${outputFormat}`
          );
        // Only add to temp files if it's not the final output path
        if (!customOutputPath && sampleRateOutputPath !== currentPath) {
          tempFiles.push(sampleRateOutputPath);
        }
        currentPath = await this.normalizeSampleRate(currentPath, sampleRateOutputPath, sampleRate);
      }

      // Step 3: Normalize channels (if needed)
      if (originalMetadata.channels && originalMetadata.channels !== channels) {
        const channelsOutputPath =
          customOutputPath ||
          path.join(
            this.tempDir,
            `channels_${Date.now()}_${Math.random().toString(36).substring(7)}.${outputFormat}`
          );
        // Only add to temp files if it's not the final output path
        if (!customOutputPath && channelsOutputPath !== currentPath) {
          tempFiles.push(channelsOutputPath);
        }
        currentPath = await this.normalizeChannels(currentPath, channelsOutputPath, channels);
      }

      // Step 4: Normalize volume (if enabled)
      if (volumeNormalization) {
        const volumeOutputPath =
          customOutputPath ||
          path.join(
            this.tempDir,
            `volume_${Date.now()}_${Math.random().toString(36).substring(7)}.${outputFormat}`
          );
        // Only add to temp files if it's not the final output path
        if (!customOutputPath && volumeOutputPath !== currentPath) {
          tempFiles.push(volumeOutputPath);
        }
        currentPath = await this.normalizeVolume(currentPath, volumeOutputPath);
      }

      // Get final metadata
      const finalMetadata = await this.getAudioMetadata(currentPath);

      return {
        outputPath: currentPath,
        metadata: finalMetadata,
        tempFiles: customOutputPath ? [] : tempFiles.filter((file) => file !== currentPath), // Don't include final output in temp files
      };
    } catch (error) {
      // Clean up temp files on error
      await this.cleanupTempFiles(tempFiles);
      throw error;
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles(filePaths: string[]): Promise<void> {
    const cleanupPromises = filePaths.map(async (filePath) => {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // File might not exist or already deleted, ignore
        console.warn(`Failed to delete temp file ${filePath}:`, error);
      }
    });

    await Promise.all(cleanupPromises);
  }

  /**
   * Optimize normalization: combine all steps in a single FFmpeg command for efficiency
   * This is more efficient than chaining multiple commands
   */
  async normalizeAudioOptimized(
    inputPath: string,
    options: NormalizationOptions = {}
  ): Promise<NormalizationResult> {
    const {
      outputFormat = 'mp3',
      sampleRate = 16000,
      channels = 1,
      volumeNormalization = true,
      outputPath: customOutputPath,
    } = options;

    const outputPath =
      customOutputPath ||
      path.join(
        this.tempDir,
        `normalized_${Date.now()}_${Math.random().toString(36).substring(7)}.${outputFormat}`
      );

    // Ensure output directory exists
    if (!customOutputPath) {
      await fs.mkdir(this.tempDir, { recursive: true });
    } else {
      const outputDir = path.dirname(outputPath);
      await fs.mkdir(outputDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      // Get original metadata first
      this.getAudioMetadata(inputPath)
        .then((originalMetadata) => {
          const command = ffmpeg(inputPath);

          // Set output format and codec
          if (outputFormat === 'mp3') {
            command.format('mp3').audioCodec('libmp3lame').audioBitrate(128);
          } else {
            command.format('wav').audioCodec('pcm_s16le');
          }

          // Set sample rate and channels directly (more reliable than filters)
          command.audioFrequency(sampleRate);
          command.audioChannels(channels);

          // Build audio filter chain for volume only (channels/samplerate handled above)
          const filterParts: string[] = [];

          // Volume normalization
          if (volumeNormalization) {
            filterParts.push('volume=-1dB');
          }

          // Apply volume filter if needed
          if (filterParts.length > 0) {
            command.audioFilters(filterParts.join(','));
          }

          command
            .on('start', (commandLine) => {
              // Debug: log the command (optional, can be removed)
              // console.log('FFmpeg command:', commandLine);
            })
            .on('end', async () => {
              try {
                const finalMetadata = await this.getAudioMetadata(outputPath);
                resolve({
                  outputPath,
                  metadata: finalMetadata,
                  tempFiles: customOutputPath ? [] : [outputPath],
                });
              } catch (error) {
                reject(
                  new Error(`Failed to get final metadata: ${error instanceof Error ? error.message : 'Unknown error'}`)
                );
              }
            })
            .on('error', (err, stdout, stderr) => {
              // Log stderr for debugging
              console.error('FFmpeg stderr:', stderr);
              reject(new Error(`Audio normalization failed: ${err.message}`));
            })
            .save(outputPath);
        })
        .catch(reject);
    });
  }
}
