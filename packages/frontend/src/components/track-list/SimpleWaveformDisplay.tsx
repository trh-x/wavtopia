import { useEffect } from "react";
import { useSimplePlayback } from "../../contexts/SimplePlaybackContext";
import { useBaseWaveform } from "../../hooks/useBaseWaveform";

interface SimpleWaveformDisplayProps {
  waveformData: number[];
  audioUrl: string;
  height?: number;
  color?: string;
  progressColor?: string;
}

export function SimpleWaveformDisplay({
  waveformData,
  audioUrl,
  height = 128,
  color = "#1f2937",
  progressColor = "#4f46e5",
}: SimpleWaveformDisplayProps) {
  const { registerWaveform, unregisterWaveform, startPlayback, stopPlayback } =
    useSimplePlayback();

  const { containerRef, wavesurferRef, state, setupWaveSurfer } =
    useBaseWaveform({
      waveformData,
      audioUrl,
      height,
      color,
      progressColor,
    });

  // Initialize WaveSurfer instance
  useEffect(() => {
    const cleanup = setupWaveSurfer(
      // onReady
      (wavesurfer) => {
        registerWaveform(wavesurfer);
      },
      // onDestroy
      (wavesurfer) => {
        unregisterWaveform(wavesurfer);
      }
    );

    return cleanup;
  }, [audioUrl]);

  const handlePlayPause = async () => {
    if (!wavesurferRef.current || !state.isReady) return;

    try {
      if (state.isPlaying) {
        stopPlayback(wavesurferRef.current);
      } else {
        startPlayback(wavesurferRef.current);
      }
    } catch (error) {
      console.error("Playback error:", error);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={handlePlayPause}
        disabled={state.isLoading || !state.isReady}
        className={`
          flex-shrink-0
          p-2.5 rounded-full 
          shadow-md hover:shadow-lg 
          transition-all duration-200
          border
          ${
            state.isLoading || !state.isReady
              ? "cursor-not-allowed opacity-50 border-gray-200"
              : state.isPlaying
              ? "bg-blue-50 hover:bg-blue-100 border-blue-200"
              : "opacity-70 bg-red-50 hover:bg-red-100 border-red-200"
          }
        `}
      >
        {state.isLoading ? (
          <svg
            className="w-5 h-5 animate-spin text-gray-600"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : state.isPlaying ? (
          <svg
            className="w-5 h-5 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.75 5.25v13.5m-7.5-13.5v13.5"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18a1 1 0 000-1.69L9.54 5.98A.998.998 0 008 6.82z"
            />
          </svg>
        )}
      </button>
      <div
        ref={containerRef}
        className={`flex-grow ${state.isPlaying ? "" : "opacity-70"}`}
        style={{ minHeight: `${height}px` }}
      />
    </div>
  );
}
