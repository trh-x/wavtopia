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
    stopAll,
    isMuted,
    soloComponent,
    isSoloed,
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

  const handleSolo = async () => {
    if (!wavesurferRef.current || !isReady) return;
    soloComponent(wavesurferRef.current);
  };

  return (
    <div className="flex items-center gap-4 group">
      <div className="flex gap-2">
        <button
          onClick={handlePlayPause}
          disabled={isLoading || !isReady}
          className={`
            flex-shrink-0
            p-2.5 rounded-full 
            shadow-md hover:shadow-lg 
            transition-all duration-200
            border
            ${
              isLoading || !isReady
                ? "cursor-not-allowed opacity-50 border-gray-200"
                : ""
            }
            ${
              isPlaying
                ? isMuted(wavesurferRef.current!)
                  ? "opacity-60 bg-gray-100 border-gray-300" // Muted state
                  : "bg-blue-50 hover:bg-blue-100 border-blue-200" // Playing state
                : "opacity-70 bg-red-50 hover:bg-red-100 border-red-200" // Stopped state
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
            isMuted(wavesurferRef.current!) ? (
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                />
              </svg>
            ) : (
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
            )
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
        {isFullTrack && (
          <button
            onClick={stopAll}
            disabled={isLoading || !isReady}
            className={`
              flex-shrink-0
              p-2.5 rounded-full 
              shadow-md hover:shadow-lg 
              transition-all duration-200
              border
              ${
                isLoading || !isReady
                  ? "cursor-not-allowed opacity-50 border-gray-200"
                  : "bg-red-50 hover:bg-red-100 border-red-200"
              }
            `}
            title="Stop All Playback"
          >
            <svg
              className="w-5 h-5 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <rect x="6" y="6" width="12" height="12" strokeWidth={2} />
            </svg>
          </button>
        )}
        {!isFullTrack && (
          <button
            onClick={handleSolo}
            disabled={isLoading || !isReady}
            className={`
              flex-shrink-0
              p-2.5 rounded-full 
              shadow-md hover:shadow-lg 
              transition-all duration-200
              border
              ${
                isLoading || !isReady
                  ? "cursor-not-allowed opacity-50 border-gray-200"
                  : ""
              }
              ${
                isSoloed(wavesurferRef.current!)
                  ? "bg-yellow-100 hover:bg-yellow-200 border-yellow-300 text-yellow-700"
                  : isPlaying && !isMuted(wavesurferRef.current!)
                  ? "bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-600"
                  : "bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-400 hover:text-gray-600"
              }
            `}
            title={isSoloed(wavesurferRef.current!) ? "Unsolo" : "Solo"}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
          </button>
        )}
      </div>
      <div
        ref={containerRef}
        className={`flex-grow ${
          isPlaying
            ? isMuted(wavesurferRef.current!)
              ? "opacity-60" // Muted state
              : "" // Playing state
            : "opacity-70" // Stopped state
        }`}
        style={{ minHeight: `${height}px` }}
      />
    </div>
  );
}
