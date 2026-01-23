# Testing Guide

This guide explains how to test the current implementation of the voice input pipeline.

## Current Testable Components

### ✅ Phase 1: Database Operations (Ready to Test)
- Database connection and schema
- Transcription CRUD operations
- Status management
- Metadata handling

### ⚠️ Phase 2: Audio Normalization (Requires FFmpeg)
- Audio format conversion
- Sample rate normalization
- Channel normalization
- Volume normalization
- Metadata extraction

### ⚠️ Phase 3: Whisper API Integration (Requires OpenAI API Key)
- OpenAI client setup
- Audio transcription
- Audio translation
- Response parsing with segments
- Retry logic and error handling
- Confidence score extraction

## Quick Start

### 1. Test Database Operations

This tests all database functionality without requiring FFmpeg:

```bash
npm run test:db
```

**What it tests:**
- ✅ Database connection
- ✅ Schema initialization
- ✅ Creating transcription records
- ✅ Retrieving transcriptions
- ✅ Updating status and metadata
- ✅ Completing transcriptions with segments
- ✅ Listing and filtering transcriptions
- ✅ Deleting transcriptions

**Expected output:**
```
🧪 Testing Database Operations
==================================================

1️⃣ Testing database connection...
✅ Database connection successful

2️⃣ Initializing database schema...
✅ Database schema initialized

3️⃣ Creating transcription record...
✅ Transcription created: { id: '...', ingestionId: '...', status: 'pending' }
...
```

### 2. Test Audio Normalization

This tests audio processing (requires FFmpeg):

```bash
# First, install FFmpeg (if not already installed)
brew install ffmpeg  # macOS
# or see FFMPEG_SETUP.md for other platforms

# Then run the test
npm run test:audio
```

**What it tests:**
- ✅ FFmpeg availability check
- ✅ Audio metadata extraction
- ✅ Format conversion (to MP3)
- ✅ Sample rate normalization (to 16kHz)
- ✅ Channel normalization (to mono)
- ✅ Unified normalization (all steps)
- ✅ Optimized normalization (single command)

**Expected output:**
```
🧪 Testing Audio Normalization
==================================================

1️⃣ Checking FFmpeg installation...
✅ FFmpeg is available
   Version: 6.x.x
   Path: /opt/homebrew/bin/ffmpeg

2️⃣ Creating test audio file...
✅ Test audio file created: /tmp/stickies-audio-test/test_input.wav
...
```

### 3. Test Whisper API Integration

This tests the OpenAI Whisper API integration (requires API key):

```bash
# Make sure OPENAI_API_KEY is set in .env file
npm run test:whisper
```

**What it tests:**
- ✅ API key validation
- ✅ Audio transcription
- ✅ Response parsing with segments
- ✅ Language detection
- ✅ Confidence score calculation
- ✅ Translation (optional)

**Note:** This test makes actual API calls and may incur costs.

**Expected output:**
```
🧪 Testing Whisper API Integration
==================================================

1️⃣ Checking OpenAI API key...
✅ API key found

2️⃣ Checking FFmpeg installation...
✅ FFmpeg is available

3️⃣ Creating Whisper client...
✅ Whisper client created

4️⃣ Validating API key...
✅ API key is valid

5️⃣ Creating test audio file...
✅ Test audio file created

6️⃣ Normalizing audio for Whisper...
✅ Audio normalized: { sampleRate: '16000 Hz', channels: 1, size: '6.34 KB' }

7️⃣ Testing transcription...
✅ Transcription successful!
   Duration: 2.45s
   Text: "Hello world, this is a test..."
   Language: en
   Segments: 1
   Confidence: 95.2%
```

### 4. Run All Tests

Run all tests (database, audio, and Whisper):

```bash
npm run test:all
# Note: test:all currently runs db and audio tests
# Run test:whisper separately as it requires API key
```

## Unit Tests (Vitest)

Run the unit test suite:

```bash
npm test
```

This runs all tests in the `src/tests/` directory:
- `tests/lib/db/transcriptions.test.ts` - Database operation tests
- `tests/lib/audio/normalizer.test.ts` - Audio normalization tests (skips if FFmpeg unavailable)

## Manual Testing

### Test Database Operations Manually

You can also test database operations interactively:

```typescript
import { createTranscription, getTranscriptionByIngestionId } from './lib/db/transcriptions';
import { generateIngestionId } from './lib/utils/ingestion-id';

// Create a transcription
const ingestionId = generateIngestionId();
const transcription = await createTranscription(ingestionId, 'test.wav', 1024);
console.log('Created:', transcription);

// Retrieve it
const retrieved = await getTranscriptionByIngestionId(ingestionId);
console.log('Retrieved:', retrieved);
```

### Test Audio Normalization Manually

```typescript
import { AudioNormalizer } from './lib/audio/normalizer';

const normalizer = new AudioNormalizer();

// Normalize an audio file
const result = await normalizer.normalizeAudio('/path/to/audio.wav', {
  outputFormat: 'mp3',
  sampleRate: 16000,
  channels: 1,
  volumeNormalization: true,
});

console.log('Normalized:', result);
```

## Testing Checklist

### Database Tests ✅
- [x] Connection test
- [x] Schema initialization
- [x] Create transcription
- [x] Retrieve transcription
- [x] Update status
- [x] Update metadata
- [x] Complete transcription
- [x] List transcriptions
- [x] Filter by status
- [x] Delete transcription

### Audio Tests (Requires FFmpeg) ⚠️
- [x] FFmpeg availability check
- [x] Metadata extraction
- [x] Format conversion
- [x] Sample rate normalization
- [x] Channel normalization
- [x] Volume normalization
- [x] Unified normalization
- [x] Optimized normalization
- [x] Temporary file cleanup

### Whisper API Tests (Requires OpenAI API Key) ⚠️
- [x] API key validation
- [x] Client initialization
- [x] Audio transcription
- [x] Response parsing
- [x] Segment extraction
- [x] Language detection
- [x] Confidence calculation
- [x] Translation support
- [x] Retry logic
- [x] Error handling

## Troubleshooting

### Database Connection Errors

If you get connection errors:
1. Make sure PostgreSQL is running:
   ```bash
   docker-compose ps  # Check if container is running
   docker-compose up -d  # Start if not running
   ```

2. Check your `.env` file has correct credentials:
   ```bash
   cat .env | grep DB_
   ```

3. Initialize the database:
   ```bash
   npm run db:init
   ```

### FFmpeg Not Found

If audio tests fail with "FFmpeg not found":
1. Install FFmpeg (see `FFMPEG_SETUP.md`)
2. Verify installation:
   ```bash
   ffmpeg -version
   ```
3. Make sure it's in your PATH

### Test Failures

If tests fail:
1. Check error messages for specific issues
2. Ensure all dependencies are installed: `npm install`
3. Check that environment variables are set correctly
4. Review the test output for specific error details

## Next Steps

Now that Phase 3 (Whisper API Integration) is complete, you can test:
- ✅ Full pipeline: Upload → Normalize → Transcribe → Save (via test scripts)
- ⏳ API endpoints (Phase 4)
- ⏳ End-to-end integration (Phase 5)

## Continuous Testing

For development, you can run tests in watch mode:

```bash
# Watch mode for unit tests
npm test -- --watch

# Or run specific test file
npm test -- tests/lib/db/transcriptions.test.ts
```
