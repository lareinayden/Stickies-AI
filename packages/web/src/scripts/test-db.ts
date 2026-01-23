/**
 * Test script for database operations
 * Run with: npm run test:db
 */

import 'dotenv/config';
import {
  createTranscription,
  getTranscriptionByIngestionId,
  updateTranscriptionStatus,
  completeTranscription,
  failTranscription,
  deleteTranscription,
  getTranscriptions,
} from '../lib/db/transcriptions';
import { generateIngestionId } from '../lib/utils/ingestion-id';
import { initializeDatabase, testConnection, closeDbPool } from '../lib/db/client';

async function testDatabase() {
  console.log('🧪 Testing Database Operations\n');
  console.log('=' .repeat(50));

  try {
    // Test 1: Connection
    console.log('\n1️⃣ Testing database connection...');
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }
    console.log('✅ Database connection successful');

    // Test 2: Initialize schema
    console.log('\n2️⃣ Initializing database schema...');
    await initializeDatabase();
    console.log('✅ Database schema initialized');

    // Test 3: Create transcription
    console.log('\n3️⃣ Creating transcription record...');
    const ingestionId = generateIngestionId();
    const transcription = await createTranscription(ingestionId, 'test-audio.wav', 1024);
    console.log('✅ Transcription created:', {
      id: transcription.id,
      ingestionId: transcription.ingestion_id,
      status: transcription.status,
    });

    // Test 4: Retrieve transcription
    console.log('\n4️⃣ Retrieving transcription by ingestion ID...');
    const retrieved = await getTranscriptionByIngestionId(ingestionId);
    if (!retrieved) {
      throw new Error('Failed to retrieve transcription');
    }
    console.log('✅ Transcription retrieved:', {
      status: retrieved.status,
      filename: retrieved.original_filename,
    });

    // Test 5: Update status
    console.log('\n5️⃣ Updating transcription status...');
    const updated = await updateTranscriptionStatus(ingestionId, 'processing');
    console.log('✅ Status updated to:', updated.status);

    // Test 6: Update metadata
    console.log('\n6️⃣ Updating transcription metadata...');
    const withMetadata = await updateTranscriptionStatus(ingestionId, 'processing');
    console.log('✅ Metadata updated');

    // Test 7: Complete transcription
    console.log('\n7️⃣ Completing transcription...');
    const segments = [
      { start: 0, end: 2.5, text: 'Hello world' },
      { start: 2.5, end: 5.0, text: 'This is a test transcription' },
    ];
    const completed = await completeTranscription(
      ingestionId,
      'Hello world. This is a test transcription.',
      segments,
      { overall: 0.95 },
      { source: 'test' }
    );
    console.log('✅ Transcription completed:', {
      status: completed.status,
      transcript: completed.transcript?.substring(0, 50) + '...',
      segments: completed.segments?.length,
    });

    // Test 8: List transcriptions
    console.log('\n8️⃣ Listing transcriptions...');
    const all = await getTranscriptions({ limit: 5 });
    console.log(`✅ Found ${all.length} transcription(s)`);
    all.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.ingestion_id} - ${t.status}`);
    });

    // Test 9: Create another transcription and test filtering
    console.log('\n9️⃣ Testing status filtering...');
    const ingestionId2 = generateIngestionId();
    await createTranscription(ingestionId2, 'test2.wav', 2048);
    const pending = await getTranscriptions({ status: 'pending', limit: 10 });
    console.log(`✅ Found ${pending.length} pending transcription(s)`);

    // Test 10: Delete transcription
    console.log('\n🔟 Deleting test transcription...');
    const deleted = await deleteTranscription(ingestionId);
    if (!deleted) {
      throw new Error('Failed to delete transcription');
    }
    console.log('✅ Transcription deleted');

    // Cleanup: Delete second test transcription
    await deleteTranscription(ingestionId2);

    console.log('\n' + '='.repeat(50));
    console.log('✅ All database tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    await closeDbPool();
  }
}

// Run tests
testDatabase();
