/**
 * Test script for audio normalization
 * Run with: npm run test:audio
 * 
 * Note: Requires FFmpeg to be installed
 */

import 'dotenv/config';
import { AudioNormalizer } from '../lib/audio/normalizer';
import { checkFFmpegAvailable, getFFmpegInstallInstructions } from '../lib/audio/ffmpeg-check';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function createTestAudio(outputPath: string): Promise<void> {
  // Generate a 2-second sine wave test audio file
  await execAsync(
    `ffmpeg -f lavfi -i "sine=frequency=440:duration=2" -ar 44100 -ac 2 ${outputPath} -y`
  );
}

async function testAudioNormalization() {
  console.log('🧪 Testing Audio Normalization\n');
  console.log('='.repeat(50));

  // Check FFmpeg availability
  console.log('\n1️⃣ Checking FFmpeg installation...');
  const ffmpegInfo = await checkFFmpegAvailable();
  
  if (!ffmpegInfo.available) {
    console.error('❌ FFmpeg is not installed!');
    console.log('\n' + getFFmpegInstallInstructions());
    process.exit(1);
  }

  console.log('✅ FFmpeg is available');
  console.log(`   Version: ${ffmpegInfo.version}`);
  if (ffmpegInfo.path) {
    console.log(`   Path: ${ffmpegInfo.path}`);
  }

  const normalizer = new AudioNormalizer();
  const tempDir = path.join(os.tmpdir(), 'stickies-audio-test');
  await fs.mkdir(tempDir, { recursive: true });

  const testAudioPath = path.join(tempDir, 'test_input.wav');
  const cleanupFiles: string[] = [testAudioPath];

  try {
    // Create test audio file
    console.log('\n2️⃣ Creating test audio file...');
    await createTestAudio(testAudioPath);
    console.log('✅ Test audio file created:', testAudioPath);

    // Test 3: Get metadata
    console.log('\n3️⃣ Extracting audio metadata...');
    const metadata = await normalizer.getAudioMetadata(testAudioPath);
    console.log('✅ Metadata extracted:', {
      duration: `${metadata.duration.toFixed(2)}s`,
      format: metadata.format,
      size: `${(metadata.size / 1024).toFixed(2)} KB`,
      sampleRate: `${metadata.sampleRate} Hz`,
      channels: metadata.channels,
    });

    // Test 4: Normalize format to MP3
    console.log('\n4️⃣ Testing format normalization (to MP3)...');
    const mp3Path = path.join(tempDir, 'test_output.mp3');
    cleanupFiles.push(mp3Path);
    await normalizer.normalizeFormat(testAudioPath, mp3Path, 'mp3');
    const mp3Metadata = await normalizer.getAudioMetadata(mp3Path);
    console.log('✅ Format normalized to MP3:', {
      format: mp3Metadata.format,
      size: `${(mp3Metadata.size / 1024).toFixed(2)} KB`,
    });

    // Test 5: Normalize sample rate
    console.log('\n5️⃣ Testing sample rate normalization (to 16kHz)...');
    const sampleRatePath = path.join(tempDir, 'test_16khz.wav');
    cleanupFiles.push(sampleRatePath);
    await normalizer.normalizeSampleRate(testAudioPath, sampleRatePath, 16000);
    const sampleRateMetadata = await normalizer.getAudioMetadata(sampleRatePath);
    console.log('✅ Sample rate normalized:', {
      original: `${metadata.sampleRate} Hz`,
      normalized: `${sampleRateMetadata.sampleRate} Hz`,
    });

    // Test 6: Normalize channels to mono
    console.log('\n6️⃣ Testing channel normalization (to mono)...');
    const monoPath = path.join(tempDir, 'test_mono.wav');
    cleanupFiles.push(monoPath);
    await normalizer.normalizeChannels(testAudioPath, monoPath, 1);
    const monoMetadata = await normalizer.getAudioMetadata(monoPath);
    console.log('✅ Channels normalized:', {
      original: `${metadata.channels} channels`,
      normalized: `${monoMetadata.channels} channel`,
    });

    // Test 7: Unified normalization
    console.log('\n7️⃣ Testing unified normalization...');
    const normalizedResult = await normalizer.normalizeAudio(testAudioPath, {
      outputFormat: 'mp3',
      sampleRate: 16000,
      channels: 1,
      volumeNormalization: true,
    });
    cleanupFiles.push(...normalizedResult.tempFiles);
    cleanupFiles.push(normalizedResult.outputPath);
    console.log('✅ Unified normalization complete:', {
      outputPath: normalizedResult.outputPath,
      duration: `${normalizedResult.metadata.duration.toFixed(2)}s`,
      format: normalizedResult.metadata.format,
      sampleRate: `${normalizedResult.metadata.sampleRate} Hz`,
      channels: normalizedResult.metadata.channels,
      size: `${(normalizedResult.metadata.size / 1024).toFixed(2)} KB`,
    });

    // Test 8: Optimized normalization
    console.log('\n8️⃣ Testing optimized normalization...');
    const optimizedResult = await normalizer.normalizeAudioOptimized(testAudioPath, {
      outputFormat: 'mp3',
      sampleRate: 16000,
      channels: 1,
      volumeNormalization: true,
    });
    cleanupFiles.push(...optimizedResult.tempFiles);
    cleanupFiles.push(optimizedResult.outputPath);
    console.log('✅ Optimized normalization complete:', {
      outputPath: optimizedResult.outputPath,
      sampleRate: `${optimizedResult.metadata.sampleRate} Hz`,
      channels: optimizedResult.metadata.channels,
    });

    console.log('\n' + '='.repeat(50));
    console.log('✅ All audio normalization tests passed!');

    // Cleanup
    console.log('\n🧹 Cleaning up test files...');
    await normalizer.cleanupTempFiles(cleanupFiles);
    console.log('✅ Cleanup complete');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    // Cleanup on error
    try {
      await normalizer.cleanupTempFiles(cleanupFiles);
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }
    process.exit(1);
  }
}

// Run tests
testAudioNormalization();
