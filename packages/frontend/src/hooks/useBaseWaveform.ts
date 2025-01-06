import { useEffect, useRef, useState, useMemo } from "react";
import WaveSurfer from "wavesurfer.js";

interface BaseWaveformConfig {
  waveformData: number[];
  audioUrl: string;
  height?: number;
  color?: string;
  progressColor?: string;
}

interface BaseWaveformState {
  isLoading: boolean;
  isReady: boolean;
  isPlaying: boolean;
}

export function useBaseWaveform({
  waveformData,
  audioUrl,
  height = 128,
  color = "#1f2937",
  progressColor = "#4f46e5",
}: BaseWaveformConfig) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [state, setState] = useState<BaseWaveformState>({
    isLoading: false,
    isReady: false,
    isPlaying: false,
  });

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
    [audioUrl]
  );

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

  const setupWaveSurfer = (
    onReady?: (wavesurfer: WaveSurfer) => void,
    onDestroy?: (wavesurfer: WaveSurfer) => void
  ) => {
    if (!containerRef.current || !waveformData?.length) return;

    // Only create if we don't have an instance
    if (!wavesurferRef.current) {
      const wavesurfer = WaveSurfer.create({
        ...initialConfig,
        container: containerRef.current,
      });

      wavesurfer.on("loading", () => {
        setState((prev) => ({ ...prev, isLoading: true }));
      });

      wavesurfer.on("ready", () => {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isReady: true,
        }));
        onReady?.(wavesurfer);
      });

      wavesurfer.on("play", () => {
        setState((prev) => ({ ...prev, isPlaying: true }));
      });

      wavesurfer.on("pause", () => {
        setState((prev) => ({ ...prev, isPlaying: false }));
      });

      wavesurfer.on("finish", () => {
        setState((prev) => ({ ...prev, isPlaying: false }));
      });

      wavesurfer.on("error", (error) => {
        console.error("WaveSurfer error:", error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isReady: false,
        }));
      });

      wavesurferRef.current = wavesurfer;
    }

    // Cleanup on unmount
    return () => {
      const wavesurfer = wavesurferRef.current;
      if (wavesurfer) {
        // Only cleanup if we're actually unmounting, not just re-rendering
        if (!document.body.contains(containerRef.current)) {
          onDestroy?.(wavesurfer);
          wavesurfer.destroy();
          wavesurferRef.current = null;
        }
      }
    };
  };

  return {
    containerRef,
    wavesurferRef,
    state,
    setupWaveSurfer,
  };
}
