import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { TrackListPlaybackContextType } from "@/contexts/TrackListPlaybackContext";
import { SyncedPlaybackContextType } from "@/contexts/SyncedPlaybackContext";
import { PlayPauseButton, StopButton, SoloButton } from "./buttons";

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
    soloStem(wavesurferRef.current);
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
