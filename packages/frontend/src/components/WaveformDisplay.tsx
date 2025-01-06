import { useEffect } from "react";
import { usePlayback } from "../contexts/PlaybackContext";
import { useBaseWaveform } from "../hooks/useBaseWaveform";
import { WaveformButton } from "./waveform/WaveformButton";
import {
  LoadingIcon,
  PauseIcon,
  PlayIcon,
  MutedIcon,
  StopIcon,
  SoloIcon,
} from "./waveform/WaveformIcons";
import { BaseWaveformContainer } from "./waveform/BaseWaveformContainer";

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
        registerWaveform(wavesurfer, isFullTrack);
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
      if (state.isPlaying && !isMuted(wavesurferRef.current)) {
        stopPlayback(wavesurferRef.current);
      } else {
        startPlayback(wavesurferRef.current);
      }
    } catch (error) {
      console.error("Playback error:", error);
    }
  };

  const handleSolo = async () => {
    if (!wavesurferRef.current || !state.isReady) return;
    soloComponent(wavesurferRef.current);
  };

  const getPlayButtonState = () => {
    if (state.isPlaying) {
      return isMuted(wavesurferRef.current!) ? "muted" : "playing";
    }
    return "stopped";
  };

  return (
    <BaseWaveformContainer
      containerRef={containerRef}
      height={height}
      isPlaying={state.isPlaying}
      isMuted={state.isPlaying && isMuted(wavesurferRef.current!)}
    >
      <WaveformButton
        onClick={handlePlayPause}
        disabled={state.isLoading || !state.isReady}
        state={getPlayButtonState()}
      >
        {state.isLoading ? (
          <LoadingIcon />
        ) : state.isPlaying ? (
          isMuted(wavesurferRef.current!) ? (
            <MutedIcon />
          ) : (
            <PauseIcon />
          )
        ) : (
          <PlayIcon />
        )}
      </WaveformButton>

      {isFullTrack && (
        <WaveformButton
          onClick={stopAll}
          disabled={state.isLoading || !state.isReady}
          variant="stop"
          title="Stop All Playback"
        >
          <StopIcon />
        </WaveformButton>
      )}

      {!isFullTrack && (
        <WaveformButton
          onClick={handleSolo}
          disabled={state.isLoading || !state.isReady}
          variant="solo"
          state={
            isSoloed(wavesurferRef.current!)
              ? "soloed"
              : state.isPlaying && !isMuted(wavesurferRef.current!)
              ? "playing"
              : "stopped"
          }
          title={isSoloed(wavesurferRef.current!) ? "Unsolo" : "Solo"}
        >
          <SoloIcon />
        </WaveformButton>
      )}
    </BaseWaveformContainer>
  );
}
