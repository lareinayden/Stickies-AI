# Microphone Input Implementation Plan

## Overview
Enable real-time microphone recording in the web app to capture voice input directly from the user's browser, replacing or complementing the file upload functionality.

## Goals
- Primary: Allow users to record audio directly from their microphone
- Secondary: Provide visual feedback during recording (timer, waveform, recording indicator)
- Tertiary: Seamlessly integrate with existing transcription pipeline

## Current State
- ✅ Backend API endpoint `/api/voice/upload` accepts audio files
- ✅ Whisper API integration working
- ✅ Audio processing pipeline (normalize → transcribe → save) complete
- ✅ File upload UI exists
- ❌ No microphone recording capability

## Technical Approach

### Architecture
- Use **MediaRecorder API** (browser native, no dependencies)
- Record audio as **WebM** format (widely supported, compatible with Whisper API)
- Convert to **Blob** and send to existing `/api/voice/upload` endpoint
- Reuse existing transcription pipeline

### Flow
1. Request microphone permission via `navigator.mediaDevices.getUserMedia()`
2. Create MediaRecorder instance with audio constraints
3. Record audio chunks into Blob
4. On stop, convert Blob to File and upload via existing API
5. Display transcription results using existing UI components

## File Structure
```
packages/web/src/
  components/
    VoiceRecorder.tsx          # New: Main recording component
    RecordingIndicator.tsx      # New: Visual feedback component
  hooks/
    useMediaRecorder.ts         # New: Custom hook for MediaRecorder logic
  app/
    page.tsx                    # Update: Add microphone recording section
```

## Dependencies
- No new npm packages required (using native browser APIs)
- MediaRecorder API (supported in all modern browsers)

## Implementation Steps

### Step 1: Create Custom Hook (`useMediaRecorder.ts`)
- Handle microphone permission requests
- Manage MediaRecorder lifecycle (start/stop/pause/resume)
- Collect audio chunks and create Blob
- Handle errors (permission denied, device unavailable)
- Return recording state, controls, and audio blob

### Step 2: Create Recording Indicator Component (`RecordingIndicator.tsx`)
- Visual indicator (pulsing dot, waveform, or timer)
- Show recording duration
- Display recording status

### Step 3: Create Voice Recorder Component (`VoiceRecorder.tsx`)
- Integrate `useMediaRecorder` hook
- Provide start/stop/pause/resume buttons
- Show recording indicator
- Handle file upload after recording stops
- Display errors and status

### Step 4: Update Main Page (`page.tsx`)
- Add microphone recording section alongside file upload
- Toggle between file upload and microphone recording modes
- Reuse existing transcription display components

### Step 5: Error Handling
- Handle microphone permission denied
- Handle no microphone available
- Handle recording errors
- Provide user-friendly error messages

## Testing Strategy

### Unit Tests
- Test `useMediaRecorder` hook with mocked MediaRecorder API
- Test error handling scenarios
- Test recording state transitions

### Integration Tests
- Test full flow: record → upload → transcribe
- Test permission flow
- Test with different browsers

### Manual Testing
- Test on Chrome, Firefox, Safari
- Test permission denied scenario
- Test recording pause/resume
- Test long recordings (>30 seconds)

## Browser Compatibility
- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (iOS 14.3+)
- Mobile browsers: ✅ Supported

## Audio Format Considerations
- **WebM** (default): Best browser support, compatible with Whisper API
- **MP3**: Not natively supported by MediaRecorder (would need conversion)
- **WAV**: Not natively supported by MediaRecorder (would need conversion)
- **Fallback**: If WebM not supported, use default codec (usually Opus in WebM container)

## Security & Privacy
- Request microphone permission only when user clicks record
- Show clear indicator when microphone is active
- Stop recording automatically on page navigation
- Clean up MediaStream on component unmount

## Notes
- MediaRecorder API requires HTTPS (or localhost for development)
- Some browsers may require user interaction before accessing microphone
- Consider adding audio level visualization (waveform) for better UX
- Future: Add real-time transcription preview (streaming to Whisper API)
