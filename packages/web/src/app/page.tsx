'use client';

import { useState } from 'react';

interface UploadResponse {
  ingestionId: string;
  status: string;
  message?: string;
  error?: string;
}

interface StatusResponse {
  ingestionId: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  metadata: {
    originalFilename: string | null;
    fileSize: number | null;
    durationSeconds: number | null;
    audioFormat: string | null;
    language: string | null;
  };
}

interface TranscriptResponse {
  ingestionId: string;
  status: string;
  transcript?: string;
  language?: string;
  segments?: Array<{ start: number; end: number; text: string }>;
  confidenceScores?: Record<string, number>;
  metadata?: {
    originalFilename: string;
    durationSeconds: number;
    createdAt: string;
    completedAt: string;
  };
  error?: string;
  message?: string;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState('');
  const [translate, setTranslate] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [uploading, setUploading] = useState(false);
  const [ingestionId, setIngestionId] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [transcript, setTranscript] = useState<TranscriptResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setIngestionId(null);
      setStatus(null);
      setTranscript(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError(null);
    setStatus(null);
    setTranscript(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (language) formData.append('language', language);
      if (translate) formData.append('translate', 'true');
      if (prompt) formData.append('prompt', prompt);

      const response = await fetch('/api/voice/upload', {
        method: 'POST',
        body: formData,
      });

      const data: UploadResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setIngestionId(data.ingestionId);

      // If status is processing or pending, start polling
      if (data.status === 'processing' || data.status === 'pending') {
        setPolling(true);
        pollStatus(data.ingestionId);
      } else {
        // If completed, fetch transcript immediately
        fetchTranscript(data.ingestionId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const pollStatus = async (id: string) => {
    const maxAttempts = 60; // 5 minutes max (5s intervals)
    let attempts = 0;

    const checkStatus = async () => {
      if (attempts >= maxAttempts) {
        setPolling(false);
        setError('Status check timeout');
        return;
      }

      try {
        const response = await fetch(`/api/voice/status/${id}`);
        const data: StatusResponse = await response.json();

        if (response.ok) {
          setStatus(data);

          if (data.status === 'completed') {
            setPolling(false);
            fetchTranscript(id);
          } else if (data.status === 'failed') {
            setPolling(false);
            setError(data.errorMessage || 'Transcription failed');
          } else {
            // Still processing, check again in 5 seconds
            attempts++;
            setTimeout(checkStatus, 5000);
          }
        }
      } catch (err) {
        setPolling(false);
        setError('Failed to check status');
      }
    };

    checkStatus();
  };

  const fetchStatus = async () => {
    if (!ingestionId) return;

    try {
      const response = await fetch(`/api/voice/status/${ingestionId}`);
      const data: StatusResponse = await response.json();

      if (response.ok) {
        setStatus(data);
      } else {
        setError('Failed to fetch status');
      }
    } catch (err) {
      setError('Failed to fetch status');
    }
  };

  const fetchTranscript = async () => {
    if (!ingestionId) return;

    try {
      const response = await fetch(`/api/voice/transcript/${ingestionId}`);
      const data: TranscriptResponse = await response.json();

      if (response.status === 202) {
        // Still processing
        setError(data.message || 'Still processing...');
      } else if (response.ok) {
        setTranscript(data);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch transcript');
      }
    } catch (err) {
      setError('Failed to fetch transcript');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🎤 Stickies AI - Voice Input Pipeline
          </h1>
          <p className="text-gray-600 mb-8">
            Upload audio files for transcription using OpenAI Whisper API
          </p>

          {/* Upload Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">
              Upload Audio File
            </h2>

            <div className="space-y-4">
              {/* File Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Audio File
                </label>
                <input
                  type="file"
                  accept="audio/*,.wav,.webm,.m4a,.mp3,.mp4,.mpeg,.mpga"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  disabled={uploading || polling}
                />
                {file && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              {/* Language Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language (optional, ISO 639-1 code like 'en', 'es', 'fr')
                </label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="en"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={uploading || polling}
                />
              </div>

              {/* Translation Toggle */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="translate"
                  checked={translate}
                  onChange={(e) => setTranslate(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={uploading || polling}
                />
                <label htmlFor="translate" className="ml-2 text-sm text-gray-700">
                  Translate to English (instead of transcribing)
                </label>
              </div>

              {/* Prompt Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prompt (optional, guides the model's style)
                </label>
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., This is a technical presentation"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={uploading || polling}
                />
              </div>

              {/* Upload Button */}
              <button
                onClick={handleUpload}
                disabled={!file || uploading || polling}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {uploading
                  ? 'Uploading...'
                  : polling
                  ? 'Processing...'
                  : 'Upload & Transcribe'}
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-semibold">Error</p>
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Status Display */}
          {ingestionId && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-gray-700">
                  Status
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={fetchStatus}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                  >
                    Refresh Status
                  </button>
                  <button
                    onClick={fetchTranscript}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                  >
                    Get Transcript
                  </button>
                </div>
              </div>

              {status && (
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <p className="font-semibold">
                        <span
                          className={`inline-block px-2 py-1 rounded text-sm ${
                            status.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : status.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : status.status === 'processing'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {status.status}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Ingestion ID</p>
                      <p className="font-mono text-xs text-gray-800 break-all">
                        {status.ingestionId}
                      </p>
                    </div>
                    {status.metadata.originalFilename && (
                      <div>
                        <p className="text-sm text-gray-600">Filename</p>
                        <p className="font-semibold">
                          {status.metadata.originalFilename}
                        </p>
                      </div>
                    )}
                    {status.metadata.durationSeconds && (
                      <div>
                        <p className="text-sm text-gray-600">Duration</p>
                        <p className="font-semibold">
                          {status.metadata.durationSeconds.toFixed(2)}s
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Transcript Display */}
          {transcript && (
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-700 mb-4">
                Transcription Result
              </h2>

              <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                {/* Full Transcript */}
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">
                    Full Transcript
                  </p>
                  <p className="text-gray-800 bg-white p-4 rounded border border-gray-200">
                    {transcript.transcript || 'No transcript available'}
                  </p>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4">
                  {transcript.language && (
                    <div>
                      <p className="text-sm text-gray-600">Language</p>
                      <p className="font-semibold">{transcript.language}</p>
                    </div>
                  )}
                  {transcript.confidenceScores?.overall && (
                    <div>
                      <p className="text-sm text-gray-600">Confidence</p>
                      <p className="font-semibold">
                        {(transcript.confidenceScores.overall * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>

                {/* Segments */}
                {transcript.segments && transcript.segments.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">
                      Segments ({transcript.segments.length})
                    </p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {transcript.segments.map((segment, index) => (
                        <div
                          key={index}
                          className="bg-white p-3 rounded border border-gray-200"
                        >
                          <p className="text-xs text-gray-500 mb-1">
                            {segment.start.toFixed(2)}s - {segment.end.toFixed(2)}s
                          </p>
                          <p className="text-sm text-gray-800">{segment.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* API Documentation Link */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              For API documentation, see{' '}
              <code className="bg-gray-100 px-2 py-1 rounded">API_DOCUMENTATION.md</code>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
