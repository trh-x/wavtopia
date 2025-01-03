import { useEffect, useRef, useState, useMemo } from "react";
import WaveSurfer from "wavesurfer.js";
import { usePlayback } from "../contexts/PlaybackContext";

interface WaveformDisplayProps {
  waveformData: number[];
  audioUrl: string;
  height?: number;
  color?: string;
  progressColor?: string;
  isFullTrack?: boolean;
}

export function WaveformDisplay({
  waveformData,
  audioUrl,
  height = 128,
  color = "#1f2937",
  progressColor = "#4f46e5",
  isFullTrack = false,
}: WaveformDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const {
    registerWaveform,
    unregisterWaveform,
    startPlayback,
    stopPlayback,
    isMuted,
  } = usePlayback();

  // Memoize the initial configuration to prevent unnecessary recreations
  const initialConfig = useMemo(
    () => ({
      container: containerRef.current,
      height,
      waveColor: color,
      progressColor,
      normalize: true,
      interact: true,
      cursorWidth: 1,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      fillParent: true,
      minPxPerSec: 1,
      backend: "WebAudio" as const,
      peaks: [new Float32Array(waveformData)],
      url: audioUrl,
      autoplay: false,
    }),
    // Only include dependencies that should cause a full recreation
    [audioUrl]
  );

  // Initialize WaveSurfer instance
  useEffect(() => {
    if (!containerRef.current || !waveformData?.length) return;

    // Only create if we don't have an instance
    if (!wavesurferRef.current) {
      const wavesurfer = WaveSurfer.create({
        ...initialConfig,
        container: containerRef.current, // Need to set this here as it might not be available during useMemo
      });

      wavesurfer.on("loading", () => {
        setIsLoading(true);
      });

      wavesurfer.on("ready", () => {
        setIsLoading(false);
        setIsReady(true);
        registerWaveform(wavesurfer, isFullTrack);
      });

      wavesurfer.on("play", () => {
        setIsPlaying(true);
      });

      wavesurfer.on("pause", () => {
        setIsPlaying(false);
      });

      wavesurfer.on("finish", () => {
        setIsPlaying(false);
        stopPlayback(wavesurfer);
      });

      wavesurfer.on("error", (error) => {
        console.error("WaveSurfer error:", error);
        setIsLoading(false);
        setIsReady(false);
      });

      wavesurferRef.current = wavesurfer;
    }

    // Cleanup on unmount
    return () => {
      const wavesurfer = wavesurferRef.current;
      if (wavesurfer) {
        // Only cleanup if we're actually unmounting, not just re-rendering
        if (!document.body.contains(containerRef.current)) {
          unregisterWaveform(wavesurfer);
          wavesurfer.destroy();
          wavesurferRef.current = null;
        }
      }
    };
  }, [initialConfig]);

  // Update WaveSurfer options when props change
  useEffect(() => {
    const currentWavesurfer = wavesurferRef.current;
    if (!currentWavesurfer) return;

    currentWavesurfer.setOptions({
      height,
      waveColor: color,
      progressColor,
    });
  }, [height, color, progressColor]);

  // Handle waveform data changes
  useEffect(() => {
    const currentWavesurfer = wavesurferRef.current;
    if (!currentWavesurfer || !waveformData?.length) return;

    const peaks = new Float32Array(waveformData);
    currentWavesurfer.setOptions({ peaks: [peaks] });
  }, [waveformData]);

  const handlePlayPause = async () => {
    if (!wavesurferRef.current || !isReady) return;

    try {
      if (isPlaying && !isMuted(wavesurferRef.current)) {
        stopPlayback(wavesurferRef.current);
      } else {
        startPlayback(wavesurferRef.current);
      }
    } catch (error) {
      console.error("Playback error:", error);
    }
  };

  return (
    <div className="flex items-center gap-4 group">
      <button
        onClick={handlePlayPause}
        disabled={isLoading || !isReady}
        className={`
          flex-shrink-0
          p-2.5 rounded-full 
          bg-white hover:bg-gray-50
          shadow-md hover:shadow-lg 
          transition-all duration-200
          border border-gray-200
          ${isLoading || !isReady ? "cursor-not-allowed opacity-50" : ""}
          ${
            !isFullTrack && isMuted(wavesurferRef.current!)
              ? "opacity-50 bg-gray-100"
              : ""
          }
        `}
      >
        {isLoading ? (
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
        ) : isPlaying ? (
          <svg
            className={`w-5 h-5 ${
              !isFullTrack && isMuted(wavesurferRef.current!)
                ? "text-gray-400"
                : "text-gray-700"
            }`}
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
            className="w-5 h-5 text-gray-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
          </svg>
        )}
      </button>
      <div
        ref={containerRef}
        className={`flex-grow ${
          !isFullTrack && isMuted(wavesurferRef.current!) && isPlaying
            ? "opacity-50"
            : ""
        }`}
        style={{ minHeight: `${height}px` }}
      />
    </div>
  );
}
