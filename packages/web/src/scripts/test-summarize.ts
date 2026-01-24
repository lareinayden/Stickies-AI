/**
 * Test script for transcript summarization and task management
 * Run with: npm run test:summarize
 * 
 * Note: Requires:
 * 1. Next.js dev server running (npm run dev)
 * 2. Valid OpenAI API key
 * 3. A completed transcription (ingestionId)
 * 
 * Usage:
 *   npm run test:summarize <ingestionId>
 *   OR
 *   npm run test:summarize  # Will create a test transcription first
 */

import 'dotenv/config';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function checkServer(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/voice/status/test`);
    console.log('✅ Server is running');
  } catch (error) {
    console.error('❌ Server is not running!');
    console.log('\nPlease start the dev server:');
    console.log('  npm run dev');
    process.exit(1);
  }
}

async function createTestTranscription(): Promise<string> {
  console.log('\n📝 Creating a test transcription...');
  console.log('   (This requires an audio file - using a simple test)');
  
  // For testing, we'll need to upload an audio file first
  // This is a simplified version - in practice, you'd upload a real file
  console.log('   ⚠️  Please upload an audio file first using:');
  console.log('      curl -X POST http://localhost:3000/api/voice/upload \\');
  console.log('        -F "file=@your-audio.wav" -F "language=en"');
  console.log('   Then use the returned ingestionId with this script.');
  
  throw new Error('Please provide an ingestionId or upload an audio file first');
}

async function getTranscription(ingestionId: string): Promise<any> {
  const response = await fetch(
    `${API_BASE_URL}/api/voice/transcript/${ingestionId}`
  );

  if (!response.ok) {
    if (response.status === 202) {
      const result = await response.json();
      throw new Error(`Transcription still processing: ${result.status}`);
    }
    const error = await response.json();
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return await response.json();
}

async function testSummarization(ingestionId: string): Promise<void> {
  console.log('🧪 Testing Transcript Summarization\n');
  console.log('='.repeat(50));
  console.log(`API Base URL: ${API_BASE_URL}\n`);

  // Check server
  console.log('1️⃣ Checking if server is running...');
  await checkServer();

  // Get transcription first
  console.log(`\n2️⃣ Getting transcription for ingestionId: ${ingestionId}...`);
  let transcription;
  try {
    transcription = await getTranscription(ingestionId);
    console.log('✅ Transcription retrieved:');
    console.log(`   Status: ${transcription.status}`);
    if (transcription.transcript) {
      console.log(`   Transcript: "${transcription.transcript.substring(0, 100)}${transcription.transcript.length > 100 ? '...' : ''}"`);
      console.log(`   Full length: ${transcription.transcript.length} characters`);
    } else {
      throw new Error('No transcript available');
    }
  } catch (error) {
    console.error('❌ Failed to get transcription:', error instanceof Error ? error.message : error);
    process.exit(1);
  }

  // Test summarization
  console.log('\n3️⃣ Testing POST /api/voice/summarize/:ingestionId...');
  try {
    const summarizeResponse = await fetch(
      `${API_BASE_URL}/api/voice/summarize/${ingestionId}`,
      { method: 'POST' }
    );

    if (!summarizeResponse.ok) {
      const error = await summarizeResponse.json();
      throw new Error(error.error || `HTTP ${summarizeResponse.status}`);
    }

    const summarizeResult = await summarizeResponse.json();
    console.log('✅ Summarization successful!');
    console.log(`   Tasks created: ${summarizeResult.tasksCreated}`);
    console.log(`   Transcription ID: ${summarizeResult.transcriptionId}`);
    
    if (summarizeResult.tasks && summarizeResult.tasks.length > 0) {
      console.log('\n   📋 Extracted Tasks:');
      summarizeResult.tasks.forEach((task: any, index: number) => {
        console.log(`   ${index + 1}. ${task.title}`);
        if (task.description) {
          console.log(`      Description: ${task.description}`);
        }
        console.log(`      Type: ${task.type}`);
        if (task.priority) {
          console.log(`      Priority: ${task.priority}`);
        }
        if (task.dueDate) {
          console.log(`      Due Date: ${new Date(task.dueDate).toLocaleString()}`);
        }
        console.log(`      Completed: ${task.completed}`);
        console.log(`      ID: ${task.id}`);
        console.log('');
      });
    } else {
      console.log('   ⚠️  No tasks extracted from transcript');
    }

    // Test getting tasks by ingestion ID
    console.log('4️⃣ Testing GET /api/tasks/:ingestionId...');
    const tasksResponse = await fetch(
      `${API_BASE_URL}/api/tasks/${ingestionId}`
    );

    if (tasksResponse.ok) {
      const tasksResult = await tasksResponse.json();
      console.log('✅ Tasks retrieved:');
      console.log(`   Total tasks: ${tasksResult.tasks.length}`);
      if (tasksResult.tasks.length > 0) {
        console.log(`   First task: "${tasksResult.tasks[0].title}"`);
      }
    } else {
      const error = await tasksResponse.json();
      console.log(`⚠️  Failed to retrieve tasks: ${error.error}`);
    }

    // Test getting all tasks
    console.log('\n5️⃣ Testing GET /api/tasks...');
    const allTasksResponse = await fetch(`${API_BASE_URL}/api/tasks`);
    if (allTasksResponse.ok) {
      const allTasksResult = await allTasksResponse.json();
      console.log('✅ All tasks retrieved:');
      console.log(`   Total tasks in system: ${allTasksResult.count}`);
    }

    // Test updating a task (if we have tasks)
    if (summarizeResult.tasks && summarizeResult.tasks.length > 0) {
      const firstTask = summarizeResult.tasks[0];
      console.log(`\n6️⃣ Testing PATCH /api/task/:taskId (marking task as completed)...`);
      
      const updateResponse = await fetch(
        `${API_BASE_URL}/api/task/${firstTask.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: true }),
        }
      );

      if (updateResponse.ok) {
        const updateResult = await updateResponse.json();
        console.log('✅ Task updated successfully:');
        console.log(`   Title: ${updateResult.title}`);
        console.log(`   Completed: ${updateResult.completed}`);
        console.log(`   Completed At: ${updateResult.completedAt ? new Date(updateResult.completedAt).toLocaleString() : 'N/A'}`);
      } else {
        const error = await updateResponse.json();
        console.log(`⚠️  Failed to update task: ${error.error}`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ All summarization tests completed!');
  } catch (error) {
    console.error('\n❌ Summarization test failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
    }
    process.exit(1);
  }
}

// Main execution
async function main() {
  const ingestionId = process.argv[2];

  if (!ingestionId) {
    console.log('📝 Transcript Summarization Test\n');
    console.log('Usage:');
    console.log('  npm run test:summarize <ingestionId>');
    console.log('\nExample:');
    console.log('  npm run test:summarize 1706123456789-550e8400-e29b-41d4-a716-446655440000');
    console.log('\nTo get an ingestionId, first upload an audio file:');
    console.log('  curl -X POST http://localhost:3000/api/voice/upload \\');
    console.log('    -F "file=@your-audio.wav" -F "language=en"');
    console.log('\nThen use the ingestionId from the response.');
    process.exit(1);
  }

  await testSummarization(ingestionId);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
