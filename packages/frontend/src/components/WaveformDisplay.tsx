import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

interface WaveformDisplayProps {
  waveformData: number[];
  audioUrl: string;
  height?: number;
  color?: string;
  progressColor?: string;
}

export function WaveformDisplay({
  waveformData,
  audioUrl,
  height = 128,
  color = "#1f2937",
  progressColor = "#4f46e5",
}: WaveformDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !waveformData?.length) return;

    // Convert waveform data to Float32Array
    const peaks = [new Float32Array(waveformData)];

    // Create WaveSurfer instance
    const wavesurfer = WaveSurfer.create({
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
      mediaControls: false,
      autoplay: false,
      url: audioUrl,
      peaks: peaks,
    });

    // Add event listeners
    wavesurfer.on("play", () => {
      console.log("Playing...");
      setIsPlaying(true);
    });

    wavesurfer.on("pause", () => {
      console.log("Paused");
      setIsPlaying(false);
    });

    wavesurfer.on("finish", () => {
      console.log("Finished");
      setIsPlaying(false);
    });

    wavesurfer.on("loading", (progress) => {
      console.log("Loading:", progress);
      setIsLoading(true);
    });

    wavesurfer.on("ready", () => {
      console.log("Ready to play");
      setIsLoading(false);
      setIsReady(true);
    });

    wavesurfer.on("error", (error) => {
      console.error("WaveSurfer error:", error);
    });

    wavesurferRef.current = wavesurfer;

    // Cleanup on unmount
    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
    };
  }, [waveformData, height, color, progressColor, audioUrl]);

  const handlePlayPause = async () => {
    if (!wavesurferRef.current) return;

    try {
      if (isPlaying) {
        await wavesurferRef.current.pause();
      } else {
        await wavesurferRef.current.play();
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
            className="w-5 h-5 text-gray-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 9v6m4-6v6M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
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
        className="flex-grow"
        style={{ minHeight: `${height}px` }}
      />
    </div>
  );
}
