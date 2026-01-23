/**
 * Test script for Whisper API integration
 * Run with: npm run test:whisper
 * 
 * Note: Requires:
 * 1. Valid OpenAI API key in .env file
 * 2. FFmpeg installed (for creating test audio)
 * 3. Test audio file or will create one
 */

import 'dotenv/config';
import { WhisperClient, createWhisperClient } from '../lib/audio/whisper-client';
import { AudioNormalizer } from '../lib/audio/normalizer';
import { checkFFmpegAvailable } from '../lib/audio/ffmpeg-check';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function createTestAudio(outputPath: string, text: string = 'Hello world, this is a test transcription'): Promise<void> {
  // Use macOS say command to generate speech, then convert to audio file
  // This creates a more realistic test
  const tempWav = path.join(os.tmpdir(), `test_speech_${Date.now()}.wav`);
  
  try {
    // Generate speech using macOS say command
    await execAsync(`say -v Samantha "${text}" -o ${tempWav}`);
    
    // Convert to MP3 for Whisper API
    await execAsync(`ffmpeg -i ${tempWav} -ar 16000 -ac 1 ${outputPath} -y`);
    
    // Clean up temp file
    await fs.unlink(tempWav).catch(() => {});
  } catch (error) {
    // Fallback: create simple sine wave if say command fails
    await execAsync(
      `ffmpeg -f lavfi -i "sine=frequency=440:duration=3" -ar 16000 -ac 1 ${outputPath} -y`
    );
  }
}

async function testWhisperAPI() {
  console.log('🧪 Testing Whisper API Integration\n');
  console.log('='.repeat(50));

  // Check API key
  console.log('\n1️⃣ Checking OpenAI API key...');
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    console.error('❌ OPENAI_API_KEY not set in .env file!');
    console.log('\nPlease:');
    console.log('1. Get an API key from https://platform.openai.com/api-keys');
    console.log('2. Add it to your .env file: OPENAI_API_KEY=sk-...');
    process.exit(1);
  }
  console.log('✅ API key found');

  // Check FFmpeg
  console.log('\n2️⃣ Checking FFmpeg installation...');
  const ffmpegInfo = await checkFFmpegAvailable();
  if (!ffmpegInfo.available) {
    console.error('❌ FFmpeg is not installed!');
    console.log('Please install FFmpeg (see FFMPEG_SETUP.md)');
    process.exit(1);
  }
  console.log('✅ FFmpeg is available');

  // Create Whisper client
  console.log('\n3️⃣ Creating Whisper client...');
  let client: WhisperClient;
  try {
    client = createWhisperClient();
    console.log('✅ Whisper client created');
  } catch (error) {
    console.error('❌ Failed to create client:', error);
    process.exit(1);
  }

  // Validate API key
  console.log('\n4️⃣ Validating API key...');
  try {
    const isValid = await client.validateApiKey();
    if (!isValid) {
      console.error('❌ API key validation failed');
      process.exit(1);
    }
    console.log('✅ API key is valid');
  } catch (error) {
    console.error('❌ API key validation error:', error);
    process.exit(1);
  }

  // Create test audio file
  console.log('\n5️⃣ Creating test audio file...');
  const tempDir = path.join(os.tmpdir(), 'stickies-whisper-test');
  await fs.mkdir(tempDir, { recursive: true });
  const testAudioPath = path.join(tempDir, 'test_audio.mp3');
  
  try {
    await createTestAudio(testAudioPath, 'Hello world, this is a test of the Whisper API transcription service');
    console.log('✅ Test audio file created:', testAudioPath);
  } catch (error) {
    console.error('❌ Failed to create test audio:', error);
    process.exit(1);
  }

  // Normalize audio
  console.log('\n6️⃣ Normalizing audio for Whisper...');
  const normalizer = new AudioNormalizer();
  let normalizedPath: string;
  try {
    const normalized = await normalizer.normalizeAudioOptimized(testAudioPath, {
      outputFormat: 'mp3',
      sampleRate: 16000,
      channels: 1,
      volumeNormalization: true,
    });
    normalizedPath = normalized.outputPath;
    console.log('✅ Audio normalized:', {
      sampleRate: `${normalized.metadata.sampleRate} Hz`,
      channels: normalized.metadata.channels,
      size: `${(normalized.metadata.size / 1024).toFixed(2)} KB`,
    });
  } catch (error) {
    console.error('❌ Audio normalization failed:', error);
    process.exit(1);
  }

  // Test transcription
  console.log('\n7️⃣ Testing transcription...');
  try {
    const startTime = Date.now();
    const result = await client.transcribe(normalizedPath, {
      responseFormat: 'verbose_json',
      timestampGranularities: ['segment'],
    });
    const duration = Date.now() - startTime;

    console.log('✅ Transcription successful!');
    console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`   Text: "${result.text}"`);
    if (result.language) {
      console.log(`   Language: ${result.language}`);
    }
    if (result.segments) {
      console.log(`   Segments: ${result.segments.length}`);
      console.log(`   First segment: "${result.segments[0]?.text}" (${result.segments[0]?.start.toFixed(2)}s - ${result.segments[0]?.end.toFixed(2)}s)`);
    }
    if (result.confidence) {
      console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    }
  } catch (error: any) {
    console.error('❌ Transcription failed:', error.message);
    if (error.statusCode) {
      console.error(`   Status code: ${error.statusCode}`);
    }
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    process.exit(1);
  }

  // Test translation (optional - only if you want to test)
  console.log('\n8️⃣ Testing translation (optional)...');
  try {
    const result = await client.translate(normalizedPath, {
      responseFormat: 'verbose_json',
    });
    console.log('✅ Translation successful!');
    console.log(`   Translated text: "${result.text}"`);
  } catch (error: any) {
    console.log('⚠️  Translation test skipped or failed:', error.message);
    // Don't fail the test if translation fails
  }

  // Cleanup
  console.log('\n🧹 Cleaning up test files...');
  try {
    await fs.unlink(testAudioPath).catch(() => {});
    await fs.unlink(normalizedPath).catch(() => {});
    await normalizer.cleanupTempFiles([normalizedPath]).catch(() => {});
    console.log('✅ Cleanup complete');
  } catch (error) {
    console.warn('⚠️  Cleanup warning:', error);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ All Whisper API tests passed!');
  console.log('\n💡 Note: This test made actual API calls and may have incurred costs.');
}

// Run tests
testWhisperAPI().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
