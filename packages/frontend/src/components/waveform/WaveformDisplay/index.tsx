import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { TrackListPlaybackContextType } from "@/contexts/TrackListPlaybackContext";
import { SyncedPlaybackContextType } from "@/contexts/SyncedPlaybackContext";
import { PlayPauseButton, StopButton, SoloButton } from "./buttons";
import { usePresignedUrl } from "@/hooks/usePresignedUrl";
import { usePlayUsage } from "@/hooks/usePlayUsage";

// Minimal valid empty WAV file as a data URL (44 bytes total)
const EMPTY_AUDIO_DATA_URL =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

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
  trackId: string; // Add trackId prop for tracking
  stemId?: string; // Optional stemId for stem tracking
}

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
  trackId,
  stemId,
}: WaveformDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [resolvedAudioUrl, setResolvedAudioUrl] = useState<string | null>(null);
  const { getPresignedUrl, isLoading: isLoadingUrl } = usePresignedUrl();
  const { startMonitoring, stopMonitoring, cleanup } = usePlayUsage({
    trackId,
    stemId,
    isStreamable,
  });

  const isWaveformReady = isReady && (isStreamable || isAudioReady);
  const isWaveformLoading =
    isLoading || (!isStreamable && !isAudioReady) || isLoadingUrl;

  const {
    registerWaveform,
    unregisterWaveform,
    startPlayback,
    stopPlayback,
    stopAll,
    isMuted,
    soloStem,
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

  // Load the presigned URL when needed
  const loadPresignedUrl = async () => {
    try {
      // FIXME: The presigned URL should not have the content-disposition header here
      const url = await getPresignedUrl(audioUrl);
      setResolvedAudioUrl(url);
      return url;
    } catch (error) {
      console.error("Failed to get presigned URL:", error);
      return null;
    }
  };

  const handlePlayPause = async () => {
    if (!wavesurferRef.current || !isWaveformReady) return;

    try {
      if (isPlaying && !isMuted(wavesurferRef.current)) {
        stopPlayback(wavesurferRef.current);
      } else {
        // For streamable mode, load the URL just before playing
        if (isStreamable && !resolvedAudioUrl) {
          const url = await loadPresignedUrl();
          if (!url) return;

          if (audioRef.current) {
            audioRef.current.src = url;
          }
        }
        startPlayback(wavesurferRef.current);
      }
    } catch (error) {
      console.error("Playback error:", error);
    }
  };

  const handleSolo = async () => {
    if (!wavesurferRef.current || !isWaveformReady) return;
    soloStem(wavesurferRef.current);
  };

  let cleanupCanPlay: () => void;

  // FIXME: This is a hack to prevent the URL from being loaded multiple times
  // due to the useEffect running twice in development mode.
  // Find a better solution in the future.
  const isLoadingUrlRef = useRef(false);

  useEffect(() => {
    async function loadUrl() {
      isLoadingUrlRef.current = true;
      // For non-streamable mode, load the URL immediately
      const url = await loadPresignedUrl();
      if (!url) return;
      setResolvedAudioUrl(url);
      isLoadingUrlRef.current = false;
    }

    if (!isStreamable && !resolvedAudioUrl && !isLoadingUrlRef.current) {
      loadUrl();
    }
  }, [isStreamable, resolvedAudioUrl, isLoadingUrlRef]);

  // Initialize WaveSurfer instance
  useEffect(() => {
    function initWaveSurfer() {
      if (!containerRef.current || !waveformData?.length) return;

      // Only create if we don't have an instance
      if (!wavesurferRef.current) {
        if (isStreamable) {
          audioRef.current = new Audio();
          audioRef.current.src = EMPTY_AUDIO_DATA_URL;
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
                url: resolvedAudioUrl || EMPTY_AUDIO_DATA_URL,
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
          if (!isMuted(wavesurfer)) {
            startMonitoring();
          }
        });

        wavesurfer.on("pause", () => {
          setIsPlaying(false);
          stopMonitoring();
        });

        wavesurfer.on("finish", () => {
          setIsPlaying(false);
          cleanup();
          stopPlayback(wavesurfer);
        });

        wavesurfer.on("error", (error) => {
          console.error("WaveSurfer error:", error);
          setIsLoading(false);
          setIsReady(false);
        });

        wavesurferRef.current = wavesurfer;
      }
    }

    // if (isStreamable || resolvedAudioUrl) {
    initWaveSurfer();
    // }

    return () => {
      // Only clean up if we are actually unmounting
      if (!document.contains(containerRef.current!)) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = "";
          audioRef.current.load();
        }

        if (wavesurferRef.current) {
          cleanup();
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
  // }, [resolvedAudioUrl]);

  // Update waveform data when it changes without recreating the entire instance
  useEffect(() => {
    const currentWavesurfer = wavesurferRef.current;
    if (!currentWavesurfer || !waveformData?.length) {
      console.log(`Skipping waveform update - missing wavesurfer or data`);
      return;
    }

    // Check if the waveform data has actually changed
    const currentPeaks = currentWavesurfer.options.peaks;
    if (currentPeaks && currentPeaks.length > 0) {
      const currentData = Array.from(currentPeaks[0]);
      const newData = Array.from(waveformData);

      // Only update if the data has actually changed
      if (JSON.stringify(currentData) !== JSON.stringify(newData)) {
        const currentTime = currentWavesurfer.getCurrentTime();
        const wasPlaying = currentWavesurfer.isPlaying();

        // Reload the WaveSurfer instance with new peaks data
        if (isStreamable) {
          currentWavesurfer.load(
            EMPTY_AUDIO_DATA_URL,
            [new Float32Array(waveformData)],
            duration
          );
        } else if (resolvedAudioUrl) {
          currentWavesurfer.load(
            resolvedAudioUrl,
            [new Float32Array(waveformData)],
            duration
          );
        }

        // Restore playback state after reload
        const handleReady = () => {
          if (currentTime > 0) {
            currentWavesurfer.seekTo(currentTime / (duration || 1));
          }
          if (wasPlaying) {
            currentWavesurfer.play();
          }
          // Remove this specific listener
          currentWavesurfer.un("ready", handleReady);
        };

        currentWavesurfer.on("ready", handleReady);
      }
    }
  }, [waveformData, duration, isStreamable, resolvedAudioUrl, stemId]);

  // Update Audio element when props change
  useEffect(() => {
    if (audioRef.current && isStreamable) {
      audioRef.current.preload = preloadMetadata ? "metadata" : "none";
    }
  }, [preloadMetadata, isStreamable]);

  // Load the URL when it becomes available
  useEffect(() => {
    const currentWavesurfer = wavesurferRef.current;
    if (!currentWavesurfer) return;

    if (!isStreamable && resolvedAudioUrl) {
      // Pass peaks and duration to preserve waveform data when loading URL
      const currentPeaks = currentWavesurfer.options.peaks;
      if (currentPeaks && currentPeaks.length > 0) {
        currentWavesurfer.load(resolvedAudioUrl, currentPeaks, duration);
      } else {
        currentWavesurfer.load(resolvedAudioUrl);
      }
    }
  }, [resolvedAudioUrl, isStreamable, duration, wavesurferRef]);

  // Update WaveSurfer options when props change
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
    currentWavesurfer.setOptions({
      height,
      waveColor: color,
      progressColor,
      peaks: [peaks],
    });
  }, [height, color, progressColor, waveformData]);

  return (
    <div className="flex items-center gap-4 group">
      <div className="flex gap-2">
        <PlayPauseButton
          isWaveformLoading={isWaveformLoading}
          isWaveformReady={isWaveformReady}
          isPlaying={isPlaying}
          isMuted={isMuted(wavesurferRef.current!)}
          onClick={handlePlayPause}
        />
        {isFullTrack && (
          <StopButton
            isWaveformLoading={isWaveformLoading}
            isWaveformReady={isWaveformReady}
            isPlaying={isPlaying}
            getCurrentTime={getCurrentTime}
            context={context}
            onClick={handleStopButton}
          />
        )}
        {!isFullTrack && (
          <SoloButton
            isWaveformLoading={isWaveformLoading}
            isWaveformReady={isWaveformReady}
            isPlaying={isPlaying}
            isMuted={isMuted(wavesurferRef.current!)}
            isSoloed={isSoloed(wavesurferRef.current!)}
            onClick={handleSolo}
          />
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
