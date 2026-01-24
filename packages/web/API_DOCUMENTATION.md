# API Documentation

## Voice Input Pipeline API

### Base URL
```
http://localhost:3000/api/voice
```

## Endpoints

### 1. Upload Audio File

**POST** `/api/voice/upload`

Upload an audio file for transcription.

#### Request

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `file` (required): Audio file (wav, webm, m4a, mp3, mp4, mpeg, mpga)
- `language` (optional): ISO 639-1 language code (e.g., 'en', 'es', 'fr')
- `translate` (optional): 'true' to translate to English instead of transcribing
- `prompt` (optional): Text to guide the model's style

**File Requirements:**
- Maximum size: 25MB
- Maximum duration: 30 seconds
- Supported formats: wav, webm, m4a, mp3, mp4, mpeg, mpga

#### Response

**Success (200):**
```json
{
  "ingestionId": "1706123456789-550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "message": "Transcription completed successfully"
}
```

**Error (400):**
```json
{
  "error": "File size (30.5MB) exceeds maximum allowed size of 25MB"
}
```

**Error (500):**
```json
{
  "ingestionId": "1706123456789-550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "error": "Transcription failed: API error"
}
```

#### Example

```bash
# Using curl
curl -X POST http://localhost:3000/api/voice/upload \
  -F "file=@audio.wav" \
  -F "language=en"

# Using curl with translation
curl -X POST http://localhost:3000/api/voice/upload \
  -F "file=@audio.wav" \
  -F "translate=true"
```

---

### 2. Get Transcription Status

**GET** `/api/voice/status/:ingestionId`

Get the current status of a transcription.

#### Request

**Path Parameters:**
- `ingestionId` (required): The ingestion ID returned from the upload endpoint

#### Response

**Success (200):**
```json
{
  "ingestionId": "1706123456789-550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "createdAt": "2024-01-23T12:00:00.000Z",
  "completedAt": "2024-01-23T12:00:05.000Z",
  "errorMessage": null,
  "metadata": {
    "originalFilename": "audio.wav",
    "fileSize": 1024000,
    "durationSeconds": 15.5,
    "audioFormat": "wav",
    "language": "en"
  }
}
```

**Status Values:**
- `pending`: Transcription is queued
- `processing`: Transcription is in progress
- `completed`: Transcription is complete
- `failed`: Transcription failed

**Not Found (404):**
```json
{
  "error": "Transcription not found"
}
```

#### Example

```bash
curl http://localhost:3000/api/voice/status/1706123456789-550e8400-e29b-41d4-a716-446655440000
```

---

### 3. Get Transcription Result

**GET** `/api/voice/transcript/:ingestionId`

Get the completed transcription result.

#### Request

**Path Parameters:**
- `ingestionId` (required): The ingestion ID returned from the upload endpoint

#### Response

**Success (200):**
```json
{
  "ingestionId": "1706123456789-550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "transcript": "Hello world, this is a test transcription.",
  "language": "en",
  "segments": [
    {
      "start": 0.0,
      "end": 2.5,
      "text": "Hello world,"
    },
    {
      "start": 2.5,
      "end": 5.0,
      "text": "this is a test transcription."
    }
  ],
  "confidenceScores": {
    "overall": 0.95
  },
  "metadata": {
    "originalFilename": "audio.wav",
    "fileSize": 1024000,
    "durationSeconds": 15.5,
    "audioFormat": "wav",
    "createdAt": "2024-01-23T12:00:00.000Z",
    "completedAt": "2024-01-23T12:00:05.000Z",
    "additionalMetadata": {
      "wordCount": 6
    }
  }
}
```

**Still Processing (202):**
```json
{
  "ingestionId": "1706123456789-550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "message": "Transcription is still being processed"
}
```

**Failed (500):**
```json
{
  "ingestionId": "1706123456789-550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "error": "Transcription failed: API error"
}
```

**Not Found (404):**
```json
{
  "error": "Transcription not found"
}
```

#### Example

```bash
curl http://localhost:3000/api/voice/transcript/1706123456789-550e8400-e29b-41d4-a716-446655440000
```

---

### 4. Summarize Transcription into Tasks

**POST** `/api/voice/summarize/:ingestionId`

Summarize a completed transcription into structured tasks and reminders using LLM.

#### Request

**Path Parameters:**
- `ingestionId` (required): The ingestion ID of a completed transcription

#### Response

**Success (200):**
```json
{
  "ingestionId": "1706123456789-550e8400-e29b-41d4-a716-446655440000",
  "transcriptionId": "550e8400-e29b-41d4-a716-446655440000",
  "tasksCreated": 3,
  "tasks": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "title": "Buy groceries",
      "description": "Get milk, eggs, and bread",
      "type": "task",
      "priority": "medium",
      "dueDate": "2024-01-24T23:59:59.999Z",
      "completed": false,
      "createdAt": "2024-01-23T12:10:00.000Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440002",
      "title": "Call dentist",
      "description": null,
      "type": "reminder",
      "priority": "high",
      "dueDate": null,
      "completed": false,
      "createdAt": "2024-01-23T12:10:00.000Z"
    }
  ]
}
```

**Error (400):**
```json
{
  "error": "Transcription is not completed yet",
  "status": "processing"
}
```

**Error (404):**
```json
{
  "error": "Transcription not found"
}
```

#### Example

```bash
curl -X POST http://localhost:3000/api/voice/summarize/1706123456789-550e8400-e29b-41d4-a716-446655440000
```

---

## Tasks API

### Base URL
```
http://localhost:3000/api/tasks
```

## Endpoints

### 1. Get All Tasks

**GET** `/api/tasks`

Get all tasks with optional filters.

#### Request

**Query Parameters:**
- `completed` (optional): Filter by completion status (true/false)
- `type` (optional): Filter by type ('task', 'reminder', 'note')
- `priority` (optional): Filter by priority ('low', 'medium', 'high')
- `limit` (optional): Limit number of results
- `offset` (optional): Pagination offset

#### Response

**Success (200):**
```json
{
  "tasks": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "transcriptionId": "550e8400-e29b-41d4-a716-446655440000",
      "ingestionId": "1706123456789-550e8400-e29b-41d4-a716-446655440000",
      "title": "Buy groceries",
      "description": "Get milk, eggs, and bread",
      "type": "task",
      "priority": "medium",
      "dueDate": "2024-01-24T23:59:59.999Z",
      "completed": false,
      "completedAt": null,
      "createdAt": "2024-01-23T12:10:00.000Z",
      "metadata": null
    }
  ],
  "count": 1
}
```

#### Example

```bash
# Get all tasks
curl http://localhost:3000/api/tasks

# Get only completed tasks
curl http://localhost:3000/api/tasks?completed=true

# Get high priority tasks
curl http://localhost:3000/api/tasks?priority=high

# Get reminders only
curl http://localhost:3000/api/tasks?type=reminder

# Pagination
curl http://localhost:3000/api/tasks?limit=10&offset=0
```

---

### 2. Get Tasks by Ingestion ID

**GET** `/api/tasks/:ingestionId`

Get all tasks for a specific ingestion ID.

#### Request

**Path Parameters:**
- `ingestionId` (required): The ingestion ID

#### Response

**Success (200):**
```json
{
  "ingestionId": "1706123456789-550e8400-e29b-41d4-a716-446655440000",
  "tasks": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "title": "Buy groceries",
      "description": "Get milk, eggs, and bread",
      "type": "task",
      "priority": "medium",
      "dueDate": "2024-01-24T23:59:59.999Z",
      "completed": false,
      "completedAt": null,
      "createdAt": "2024-01-23T12:10:00.000Z",
      "metadata": null
    }
  ]
}
```

#### Example

```bash
curl http://localhost:3000/api/tasks/1706123456789-550e8400-e29b-41d4-a716-446655440000
```

---

### 3. Get Task by ID

**GET** `/api/task/:taskId`

Get a specific task by its ID.

#### Request

**Path Parameters:**
- `taskId` (required): The task ID

#### Response

**Success (200):**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "transcriptionId": "550e8400-e29b-41d4-a716-446655440000",
  "ingestionId": "1706123456789-550e8400-e29b-41d4-a716-446655440000",
  "title": "Buy groceries",
  "description": "Get milk, eggs, and bread",
  "type": "task",
  "priority": "medium",
  "dueDate": "2024-01-24T23:59:59.999Z",
  "completed": false,
  "completedAt": null,
  "createdAt": "2024-01-23T12:10:00.000Z",
  "metadata": null
}
```

#### Example

```bash
curl http://localhost:3000/api/task/660e8400-e29b-41d4-a716-446655440001
```

---

### 4. Update Task

**PATCH** `/api/task/:taskId`

Update a task (mark as completed, update fields, etc.).

#### Request

**Path Parameters:**
- `taskId` (required): The task ID

**Body (JSON):**
```json
{
  "completed": true
}
```

Or update other fields:
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "priority": "high",
  "dueDate": "2024-01-25T23:59:59.999Z"
}
```

#### Response

**Success (200):**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "title": "Buy groceries",
  "description": "Get milk, eggs, and bread",
  "type": "task",
  "priority": "medium",
  "dueDate": "2024-01-24T23:59:59.999Z",
  "completed": true,
  "completedAt": "2024-01-23T14:30:00.000Z",
  "createdAt": "2024-01-23T12:10:00.000Z"
}
```

#### Example

```bash
# Mark task as completed
curl -X PATCH http://localhost:3000/api/task/660e8400-e29b-41d4-a716-446655440001 \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'

# Update task fields
curl -X PATCH http://localhost:3000/api/task/660e8400-e29b-41d4-a716-446655440001 \
  -H "Content-Type: application/json" \
  -d '{"priority": "high", "title": "Urgent: Buy groceries"}'
```

---

### 5. Delete Task

**DELETE** `/api/task/:taskId`

Delete a task.

#### Request

**Path Parameters:**
- `taskId` (required): The task ID

#### Response

**Success (200):**
```json
{
  "message": "Task deleted successfully",
  "taskId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Not Found (404):**
```json
{
  "error": "Task not found"
}
```

#### Example

```bash
curl -X DELETE http://localhost:3000/api/task/660e8400-e29b-41d4-a716-446655440001
```

---

## Error Codes

| Status Code | Description |
|------------|-------------|
| 200 | Success |
| 202 | Accepted (still processing) |
| 400 | Bad Request (validation error) |
| 404 | Not Found |
| 500 | Internal Server Error |

## Rate Limits

Currently, there are no rate limits implemented. For production, consider:
- Implementing rate limiting per IP
- Using a job queue for async processing
- Adding request throttling

## Testing

See `TESTING.md` for detailed testing instructions.

### Quick Test

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. In another terminal, run the API test:
   ```bash
   npm run test:api
   ```

3. Or test manually with curl:
   ```bash
   # Upload
   curl -X POST http://localhost:3000/api/voice/upload \
     -F "file=@your-audio.wav" \
     -F "language=en"
   
   # Check status (use ingestionId from upload response)
   curl http://localhost:3000/api/voice/status/<ingestionId>
   
   # Get transcript
   curl http://localhost:3000/api/voice/transcript/<ingestionId>
   
   # Summarize transcript into tasks
   curl -X POST http://localhost:3000/api/voice/summarize/<ingestionId>
   
   # Get tasks for ingestion
   curl http://localhost:3000/api/tasks/<ingestionId>
   ```
