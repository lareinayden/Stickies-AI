'use client';

import { useState, useEffect } from 'react';
import { useMediaRecorder } from '../hooks/useMediaRecorder';
import { RecordingIndicator } from './RecordingIndicator';

interface VoiceRecorderProps {
  language?: string;
  translate?: boolean;
  prompt?: string;
  onUploadStart?: () => void;
  onUploadComplete?: (ingestionId: string) => void;
  onError?: (error: string) => void;
}

interface UploadResponse {
  ingestionId: string;
  status: string;
  message?: string;
  error?: string;
}

/**
 * Voice recorder component with recording controls and automatic upload
 */
export function VoiceRecorder({
  language,
  translate,
  prompt,
  onUploadStart,
  onUploadComplete,
  onError,
}: VoiceRecorderProps) {
  const [uploading, setUploading] = useState(false);
  const [ingestionId, setIngestionId] = useState<string | null>(null);

  const {
    isRecording,
    isPaused,
    duration,
    error: recorderError,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    audioBlob,
    hasPermission,
  } = useMediaRecorder({
    onRecordingComplete: async (blob) => {
      // Automatically upload when recording stops
      await handleUpload(blob);
    },
    onError: (error) => {
      onError?.(error.message);
    },
  });

  // Upload audio blob to the API
  const handleUpload = async (blob: Blob) => {
    if (!blob || blob.size === 0) {
      onError?.('No audio recorded');
      return;
    }

    setUploading(true);
    onUploadStart?.();
    setIngestionId(null);

    try {
      // Create a File from the Blob
      const file = new File([blob], `recording-${Date.now()}.webm`, {
        type: blob.type || 'audio/webm',
      });

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      if (language) formData.append('language', language);
      if (translate) formData.append('translate', 'true');
      if (prompt) formData.append('prompt', prompt);

      // Upload to API
      const response = await fetch('/api/voice/upload', {
        method: 'POST',
        body: formData,
      });

      const data: UploadResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setIngestionId(data.ingestionId);
      onUploadComplete?.(data.ingestionId);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to upload recording';
      onError?.(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  // Display recorder errors
  useEffect(() => {
    if (recorderError) {
      onError?.(recorderError);
    }
  }, [recorderError, onError]);

  // Check if browser supports MediaRecorder
  const isSupported =
    typeof window !== 'undefined' &&
    'MediaRecorder' in window &&
    'navigator' in window &&
    'mediaDevices' in navigator &&
    'getUserMedia' in navigator.mediaDevices;

  if (!isSupported) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800 text-sm">
          Your browser does not support microphone recording. Please use a modern
          browser like Chrome, Firefox, or Safari.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Recording Indicator */}
      <RecordingIndicator
        isRecording={isRecording}
        isPaused={isPaused}
        duration={duration}
      />

      {/* Permission Status */}
      {hasPermission === false && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm font-semibold mb-1">
            Microphone Access Denied
          </p>
          <p className="text-red-600 text-sm">
            Please allow microphone access in your browser settings and refresh the
            page.
          </p>
        </div>
      )}

      {/* Recording Controls */}
      <div className="flex items-center gap-3">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={uploading || hasPermission === false}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
            Start Recording
          </button>
        ) : (
          <>
            {isPaused ? (
              <button
                onClick={resumeRecording}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                    clipRule="evenodd"
                  />
                </svg>
                Resume
              </button>
            ) : (
              <button
                onClick={pauseRecording}
                className="flex items-center gap-2 px-6 py-3 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Pause
              </button>
            )}
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                  clipRule="evenodd"
                />
              </svg>
              Stop & Upload
            </button>
          </>
        )}

        {uploading && (
          <div className="flex items-center gap-2 text-gray-600">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-sm">Uploading...</span>
          </div>
        )}
      </div>

      {/* Upload Status */}
      {ingestionId && !uploading && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">
            Recording uploaded successfully! Ingestion ID: {ingestionId}
          </p>
        </div>
      )}
    </div>
  );
}
