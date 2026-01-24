/**
 * Test script for API endpoints
 * Run with: npm run test:api
 * 
 * Note: Requires:
 * 1. Next.js dev server running (npm run dev)
 * 2. Valid OpenAI API key
 * 3. FFmpeg installed
 * 4. Test audio file
 */

import 'dotenv/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function createTestAudio(outputPath: string): Promise<void> {
  // Create a simple test audio file
  await execAsync(
    `ffmpeg -f lavfi -i "sine=frequency=440:duration=2" -ar 16000 -ac 1 ${outputPath} -y`
  );
}

async function testAPI() {
  console.log('🧪 Testing API Endpoints\n');
  console.log('='.repeat(50));
  console.log(`API Base URL: ${API_BASE_URL}\n`);

  // Check if server is running
  console.log('1️⃣ Checking if server is running...');
  try {
    const response = await fetch(`${API_BASE_URL}/api/voice/status/test`);
    console.log('✅ Server is running');
  } catch (error) {
    console.error('❌ Server is not running!');
    console.log('\nPlease start the dev server:');
    console.log('  npm run dev');
    process.exit(1);
  }

  // Create test audio file
  console.log('\n2️⃣ Creating test audio file...');
  const tempDir = path.join(os.tmpdir(), 'stickies-api-test');
  await fs.mkdir(tempDir, { recursive: true });
  const testAudioPath = path.join(tempDir, 'test_audio.wav');
  await createTestAudio(testAudioPath);
  console.log('✅ Test audio file created');

  // Test upload endpoint
  console.log('\n3️⃣ Testing POST /api/voice/upload...');
  try {
    const formData = new FormData();
    const fileBuffer = await fs.readFile(testAudioPath);
    const fileBlob = new Blob([fileBuffer], { type: 'audio/wav' });
    formData.append('file', fileBlob, 'test_audio.wav');
    formData.append('language', 'en');

    const uploadResponse = await fetch(`${API_BASE_URL}/api/voice/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      throw new Error(error.error || `HTTP ${uploadResponse.status}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('✅ Upload successful!');
    console.log(`   Ingestion ID: ${uploadResult.ingestionId}`);
    console.log(`   Status: ${uploadResult.status}`);

    const ingestionId = uploadResult.ingestionId;

    // Wait a bit for processing (if async)
    if (uploadResult.status === 'processing' || uploadResult.status === 'pending') {
      console.log('\n   Waiting for processing...');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    // Test status endpoint
    console.log('\n4️⃣ Testing GET /api/voice/status/:ingestionId...');
    const statusResponse = await fetch(
      `${API_BASE_URL}/api/voice/status/${ingestionId}`
    );
    const statusResult = await statusResponse.json();
    console.log('✅ Status retrieved:');
    console.log(`   Status: ${statusResult.status}`);
    console.log(`   Created: ${statusResult.createdAt}`);
    if (statusResult.completedAt) {
      console.log(`   Completed: ${statusResult.completedAt}`);
    }

    // Test transcript endpoint
    console.log('\n5️⃣ Testing GET /api/voice/transcript/:ingestionId...');
    const transcriptResponse = await fetch(
      `${API_BASE_URL}/api/voice/transcript/${ingestionId}`
    );

    if (transcriptResponse.status === 202) {
      console.log('⚠️  Transcript still processing (202)');
      const result = await transcriptResponse.json();
      console.log(`   Status: ${result.status}`);
      console.log(`   Message: ${result.message}`);
    } else if (transcriptResponse.ok) {
      const transcriptResult = await transcriptResponse.json();
      console.log('✅ Transcript retrieved:');
      console.log(`   Status: ${transcriptResult.status}`);
      if (transcriptResult.transcript) {
        console.log(`   Transcript: "${transcriptResult.transcript}"`);
      }
      if (transcriptResult.language) {
        console.log(`   Language: ${transcriptResult.language}`);
      }
      if (transcriptResult.segments) {
        console.log(`   Segments: ${transcriptResult.segments.length}`);
      }

      // Test summarization if transcript is available
      if (transcriptResult.transcript && transcriptResult.status === 'completed') {
        console.log('\n6️⃣ Testing POST /api/voice/summarize/:ingestionId...');
        try {
          const summarizeResponse = await fetch(
            `${API_BASE_URL}/api/voice/summarize/${ingestionId}`,
            { method: 'POST' }
          );

          if (summarizeResponse.ok) {
            const summarizeResult = await summarizeResponse.json();
            console.log('✅ Summarization successful!');
            console.log(`   Tasks created: ${summarizeResult.tasksCreated}`);
            if (summarizeResult.tasks && summarizeResult.tasks.length > 0) {
              console.log(`   First task: "${summarizeResult.tasks[0].title}"`);
            }
          } else {
            const error = await summarizeResponse.json();
            console.log(`⚠️  Summarization: ${error.error || 'Unknown error'}`);
          }
        } catch (error) {
          console.log(`⚠️  Summarization test skipped: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } else {
      const error = await transcriptResponse.json();
      console.log(`⚠️  Transcript retrieval: ${error.error || 'Unknown error'}`);
    }

    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await fs.unlink(testAudioPath).catch(() => {});
    console.log('✅ Cleanup complete');

    console.log('\n' + '='.repeat(50));
    console.log('✅ All API endpoint tests completed!');
    console.log('\n💡 Tip: To test summarization in detail, run:');
    console.log(`   npm run test:summarize ${ingestionId}`);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testAPI().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
