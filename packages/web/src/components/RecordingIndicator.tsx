'use client';

interface RecordingIndicatorProps {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
}

/**
 * Visual indicator component for recording status
 * Shows pulsing dot, recording state, and duration
 */
export function RecordingIndicator({
  isRecording,
  isPaused,
  duration,
}: RecordingIndicatorProps) {
  if (!isRecording) {
    return null;
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
      {/* Pulsing recording dot */}
      <div className="relative">
        <div
          className={`w-4 h-4 rounded-full ${
            isPaused ? 'bg-yellow-500' : 'bg-red-500'
          } ${!isPaused ? 'animate-pulse' : ''}`}
        />
        {!isPaused && (
          <div className="absolute inset-0 w-4 h-4 rounded-full bg-red-500 animate-ping opacity-75" />
        )}
      </div>

      {/* Status text */}
      <div className="flex-1">
        <p className="text-sm font-semibold text-red-800">
          {isPaused ? 'Recording Paused' : 'Recording...'}
        </p>
        <p className="text-xs text-red-600 font-mono">
          {formatDuration(duration)}
        </p>
      </div>
    </div>
  );
}
