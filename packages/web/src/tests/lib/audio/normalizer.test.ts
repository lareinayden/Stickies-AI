/**
 * Unit tests for AudioNormalizer
 * 
 * Note: These tests require FFmpeg to be installed on the system.
 * They may be skipped if FFmpeg is not available.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AudioNormalizer } from '../../../lib/audio/normalizer';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Helper to check if FFmpeg is available
async function checkFFmpegAvailable(): Promise<boolean> {
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    await execAsync('ffmpeg -version');
    return true;
  } catch {
    return false;
  }
}

describe('AudioNormalizer', () => {
  let normalizer: AudioNormalizer;
  let testAudioPath: string;
  let ffmpegAvailable: boolean;

  beforeAll(async () => {
    normalizer = new AudioNormalizer();
    ffmpegAvailable = await checkFFmpegAvailable();

    // Create a simple test audio file (sine wave) if FFmpeg is available
    if (ffmpegAvailable) {
      const tempDir = path.join(os.tmpdir(), 'stickies-audio-test');
      await fs.mkdir(tempDir, { recursive: true });
      testAudioPath = path.join(tempDir, 'test_audio.wav');

      // Generate a 1-second sine wave test audio file
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      try {
        await execAsync(
          `ffmpeg -f lavfi -i "sine=frequency=440:duration=1" -ar 44100 -ac 2 ${testAudioPath}`
        );
      } catch (error) {
        console.warn('Failed to create test audio file:', error);
        ffmpegAvailable = false;
      }
    }
  });

  afterAll(async () => {
    // Clean up test files
    if (testAudioPath) {
      try {
        await fs.unlink(testAudioPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe('getAudioMetadata', () => {
    it('should extract audio metadata from file', async () => {
      if (!ffmpegAvailable) {
        console.log('Skipping test: FFmpeg not available');
        return;
      }

      const metadata = await normalizer.getAudioMetadata(testAudioPath);

      expect(metadata).toBeDefined();
      expect(metadata.duration).toBeGreaterThan(0);
      expect(metadata.format).toBeDefined();
      expect(metadata.size).toBeGreaterThan(0);
      expect(metadata.sampleRate).toBe(44100);
      expect(metadata.channels).toBe(2);
    });

    it('should throw error for non-existent file', async () => {
      if (!ffmpegAvailable) {
        console.log('Skipping test: FFmpeg not available');
        return;
      }

      await expect(
        normalizer.getAudioMetadata('/nonexistent/file.wav')
      ).rejects.toThrow();
    });
  });

  describe('normalizeFormat', () => {
    it('should convert audio to mp3 format', async () => {
      if (!ffmpegAvailable) {
        console.log('Skipping test: FFmpeg not available');
        return;
      }

      const outputPath = path.join(
        os.tmpdir(),
        `test_output_${Date.now()}.mp3`
      );

      try {
        const result = await normalizer.normalizeFormat(
          testAudioPath,
          outputPath,
          'mp3'
        );

        expect(result).toBe(outputPath);
        const stats = await fs.stat(outputPath);
        expect(stats.size).toBeGreaterThan(0);

        // Clean up
        await fs.unlink(outputPath);
      } catch (error) {
        // Clean up on error
        try {
          await fs.unlink(outputPath);
        } catch {
          // Ignore
        }
        throw error;
      }
    });

    it('should convert audio to wav format', async () => {
      if (!ffmpegAvailable) {
        console.log('Skipping test: FFmpeg not available');
        return;
      }

      const outputPath = path.join(
        os.tmpdir(),
        `test_output_${Date.now()}.wav`
      );

      try {
        const result = await normalizer.normalizeFormat(
          testAudioPath,
          outputPath,
          'wav'
        );

        expect(result).toBe(outputPath);
        const stats = await fs.stat(outputPath);
        expect(stats.size).toBeGreaterThan(0);

        // Clean up
        await fs.unlink(outputPath);
      } catch (error) {
        try {
          await fs.unlink(outputPath);
        } catch {
          // Ignore
        }
        throw error;
      }
    });
  });

  describe('normalizeSampleRate', () => {
    it('should resample audio to 16kHz', async () => {
      if (!ffmpegAvailable) {
        console.log('Skipping test: FFmpeg not available');
        return;
      }

      const outputPath = path.join(
        os.tmpdir(),
        `test_samplerate_${Date.now()}.wav`
      );

      try {
        const result = await normalizer.normalizeSampleRate(
          testAudioPath,
          outputPath,
          16000
        );

        expect(result).toBe(outputPath);

        // Verify sample rate
        const metadata = await normalizer.getAudioMetadata(outputPath);
        expect(metadata.sampleRate).toBe(16000);

        // Clean up
        await fs.unlink(outputPath);
      } catch (error) {
        try {
          await fs.unlink(outputPath);
        } catch {
          // Ignore
        }
        throw error;
      }
    });
  });

  describe('normalizeChannels', () => {
    it('should convert audio to mono', async () => {
      if (!ffmpegAvailable) {
        console.log('Skipping test: FFmpeg not available');
        return;
      }

      const outputPath = path.join(
        os.tmpdir(),
        `test_channels_${Date.now()}.wav`
      );

      try {
        const result = await normalizer.normalizeChannels(
          testAudioPath,
          outputPath,
          1
        );

        expect(result).toBe(outputPath);

        // Verify channels
        const metadata = await normalizer.getAudioMetadata(outputPath);
        expect(metadata.channels).toBe(1);

        // Clean up
        await fs.unlink(outputPath);
      } catch (error) {
        try {
          await fs.unlink(outputPath);
        } catch {
          // Ignore
        }
        throw error;
      }
    });
  });

  describe('normalizeAudio (unified)', () => {
    it('should normalize audio with all steps', async () => {
      if (!ffmpegAvailable) {
        console.log('Skipping test: FFmpeg not available');
        return;
      }

      const result = await normalizer.normalizeAudio(testAudioPath, {
        outputFormat: 'mp3',
        sampleRate: 16000,
        channels: 1,
        volumeNormalization: true,
      });

      expect(result.outputPath).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.sampleRate).toBe(16000);
      expect(result.metadata.channels).toBe(1);

      // Clean up temp files
      await normalizer.cleanupTempFiles(result.tempFiles);
    });

    it('should use optimized normalization method', async () => {
      if (!ffmpegAvailable) {
        console.log('Skipping test: FFmpeg not available');
        return;
      }

      const result = await normalizer.normalizeAudioOptimized(testAudioPath, {
        outputFormat: 'mp3',
        sampleRate: 16000,
        channels: 1,
        volumeNormalization: true,
      });

      expect(result.outputPath).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.sampleRate).toBe(16000);
      expect(result.metadata.channels).toBe(1);

      // Clean up temp files
      await normalizer.cleanupTempFiles(result.tempFiles);
    });
  });

  describe('cleanupTempFiles', () => {
    it('should clean up temporary files', async () => {
      const tempFile = path.join(os.tmpdir(), `test_cleanup_${Date.now()}.txt`);
      await fs.writeFile(tempFile, 'test content');

      await normalizer.cleanupTempFiles([tempFile]);

      // File should be deleted
      await expect(fs.access(tempFile)).rejects.toThrow();
    });
  });
});
