import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { TrackListPlaybackContextType } from "@/contexts/TrackListPlaybackContext";
import { SyncedPlaybackContextType } from "@/contexts/SyncedPlaybackContext";

interface WaveformDisplayProps {
  context: TrackListPlaybackContextType | SyncedPlaybackContextType;
  waveformData: number[];
  audioUrl: string;
  duration?: number;
  preloadMetadata?: boolean;
  height?: number;
  color?: string;
  progressColor?: string;
  isFullTrack?: boolean;
  isStreamable?: boolean;
}

interface ButtonIconProps {
  isWaveformLoading: boolean;
  isPlaying: boolean;
  isMuted: boolean;
}

const ButtonIcon = ({
  isWaveformLoading,
  isPlaying,
  isMuted,
}: ButtonIconProps) => {
  return isWaveformLoading ? (
    <svg className="w-5 h-5 animate-spin text-gray-600" viewBox="0 0 24 24">
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
    isMuted ? (
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
  );
};

export function WaveformDisplay({
  context,
  waveformData,
  audioUrl,
  duration,
  preloadMetadata = false,
  height = 128,
  color = "#1f2937",
  progressColor = "#4f46e5",
  isFullTrack = false,
  isStreamable = false,
}: WaveformDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioReady, setIsAudioReady] = useState(false);

  const isWaveformReady = isReady && (isStreamable || isAudioReady);
  const isWaveformLoading = isLoading || (!isStreamable && !isAudioReady);

  const {
    registerWaveform,
    unregisterWaveform,
    startPlayback,
    stopPlayback,
    stopAll,
    isMuted,
    soloComponent,
    isSoloed,
    triggerUpdate,
  } = context;

  const getCurrentTime = () => wavesurferRef.current?.getCurrentTime() ?? 0;

  const handleStopButton = () => {
    if (context.type === "synced") {
      stopAll();
    } else {
      stopPlayback(wavesurferRef.current!);
    }
    triggerUpdate();
  };

  const getStopButtonTitle = () => {
    if (isPlaying) {
      return "Stop Playback";
    }

    if (getCurrentTime() === 0) {
      return context.type === "synced"
        ? "" // Nothing to do in this state
        : "Stop All Tracks";
    }

    return "Reset to Start";
  };

  const getStopButtonIcon = () => {
    if (isPlaying) {
      // Square stop icon
      return <rect x="6" y="6" width="12" height="12" strokeWidth={2} />;
    }

    if (getCurrentTime() === 0) {
      return context.type === "synced" ? (
        // Square stop icon
        <rect x="6" y="6" width="12" height="12" strokeWidth={2} />
      ) : (
        // Double square icon for stop all
        <>
          <rect x="4" y="4" width="8" height="8" strokeWidth={2} />
          <rect x="12" y="12" width="8" height="8" strokeWidth={2} />
        </>
      );
    }

    // Reset/return to start icon
    return (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z"
        />
      </>
    );
  };

  let cleanupCanPlay: () => void;

  // Initialize WaveSurfer instance
  useEffect(() => {
    if (!containerRef.current || !waveformData?.length) return;

    // Only create if we don't have an instance
    if (!wavesurferRef.current) {
      if (isStreamable) {
        audioRef.current = new Audio();
        audioRef.current.src = audioUrl;
        audioRef.current.preload = preloadMetadata ? "metadata" : "none";
      }

      const params = {
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
        minPxPerSec: 0,
        peaks: [new Float32Array(waveformData)],
        duration,
        autoplay: false,
        ...(isStreamable
          ? { media: audioRef.current }
          : {
              url: audioUrl,
              backend: "WebAudio" as const,
            }),
      };
      const wavesurfer = WaveSurfer.create(params);

      if (!isStreamable) {
        // TODO: It would be nice to extend wavesurfer to emit progress events so we can show a progress bar
        // See https://github.com/katspaugh/wavesurfer.js/blob/f56ea150c03f0d01f3e260208347606aceb00ce5/src/webaudio.ts#L65-L85
        cleanupCanPlay = (wavesurfer as any).onMediaEvent("canplay", () => {
          setIsAudioReady(true);
        });
      }

      wavesurfer.on("ready", () => {
        setIsLoading(false);
        setIsReady(true);
        registerWaveform(wavesurfer, { isFullTrack });
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

    return () => {
      // Only clean up if we are actually unmounting
      if (!document.contains(containerRef.current!)) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = "";
          audioRef.current.load();
        }

        if (wavesurferRef.current) {
          unregisterWaveform(wavesurferRef.current!);
          wavesurferRef.current.destroy();
          wavesurferRef.current = null;
        }

        if (cleanupCanPlay) {
          cleanupCanPlay();
        }
      }
    };
  }, []);

  // Update Audio element when props change
  useEffect(() => {
    if (audioRef.current && isStreamable) {
      audioRef.current.src = audioUrl;
      audioRef.current.preload = preloadMetadata ? "metadata" : "none";
    }
  }, [audioUrl, preloadMetadata, isStreamable]);

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

    // if (cleanupCanPlay) {
    //   cleanupCanPlay();
    // }

    // if (isStreamable) {
    //   cleanupCanPlay = (wavesurferRef.current as any).onMediaEvent("canplay", () => {
    //     setIsAudioReady(true);
    //   });
    // }

    const peaks = new Float32Array(waveformData);
    currentWavesurfer.setOptions({ peaks: [peaks] });
  }, [waveformData]);

  const handlePlayPause = async () => {
    if (!wavesurferRef.current || !isWaveformReady) return;

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
    if (!wavesurferRef.current || !isWaveformReady) return;
    soloComponent(wavesurferRef.current);
  };

  return (
    <div className="flex items-center gap-4 group">
      <div className="flex gap-2">
        <button
          onClick={handlePlayPause}
          disabled={isWaveformLoading || !isWaveformReady}
          className={`
            flex-shrink-0
            p-2.5 rounded-full 
            shadow-md hover:shadow-lg 
            transition-all duration-200
            border
            ${
              isWaveformLoading || !isWaveformReady
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
          <ButtonIcon
            isWaveformLoading={isWaveformLoading}
            isPlaying={isPlaying}
            isMuted={isMuted(wavesurferRef.current!)}
          />
        </button>
        {isFullTrack && (
          <button
            onClick={handleStopButton}
            disabled={isWaveformLoading || !isWaveformReady}
            className={`
              flex-shrink-0
              p-2.5 rounded-full 
              shadow-md hover:shadow-lg 
              transition-all duration-200
              border
              ${
                isWaveformLoading || !isWaveformReady
                  ? "cursor-not-allowed opacity-50 border-gray-200"
                  : "bg-red-50 hover:bg-red-100 border-red-200"
              }
            `}
            title={getStopButtonTitle()}
          >
            <svg
              className="w-5 h-5 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {getStopButtonIcon()}
            </svg>
          </button>
        )}
        {!isFullTrack && (
          <button
            onClick={handleSolo}
            disabled={isWaveformLoading || !isWaveformReady}
            className={`
              flex-shrink-0
              p-2.5 rounded-full 
              shadow-md hover:shadow-lg 
              transition-all duration-200
              border
              ${
                isWaveformLoading || !isWaveformReady
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
        // TODO: Use classNames utility
        className={`flex-grow ${
          isPlaying
            ? isMuted(wavesurferRef.current!)
              ? "opacity-60" // Muted state
              : "" // Playing state
            : "opacity-70" // Stopped state
        } ${!isWaveformLoading && isWaveformReady ? "cursor-pointer" : ""}`}
        style={{ minHeight: `${height}px` }}
      />
    </div>
  );
}
