import { useEffect } from "react";
import { useSimplePlayback } from "../../contexts/SimplePlaybackContext";
import { useBaseWaveform } from "../../hooks/useBaseWaveform";
import { WaveformButton } from "../waveform/WaveformButton";
import { LoadingIcon, PauseIcon, PlayIcon } from "../waveform/WaveformIcons";
import { BaseWaveformContainer } from "../waveform/BaseWaveformContainer";

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
    <BaseWaveformContainer
      containerRef={containerRef}
      height={height}
      isPlaying={state.isPlaying}
    >
      <WaveformButton
        onClick={handlePlayPause}
        disabled={state.isLoading || !state.isReady}
        state={state.isPlaying ? "playing" : "stopped"}
      >
        {state.isLoading ? (
          <LoadingIcon />
        ) : state.isPlaying ? (
          <PauseIcon />
        ) : (
          <PlayIcon />
        )}
      </WaveformButton>
    </BaseWaveformContainer>
  );
}
