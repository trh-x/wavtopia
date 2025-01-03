import { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";

interface WaveformDisplayProps {
  waveformData: number[];
  height?: number;
  color?: string;
  progressColor?: string;
}

export function WaveformDisplay({
  waveformData,
  height = 128,
  color = "#1f2937",
  progressColor = "#4f46e5",
}: WaveformDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    console.log("WaveformDisplay - received data:", {
      waveformData,
      length: waveformData?.length,
      containerExists: !!containerRef.current,
    });

    if (!containerRef.current || !waveformData?.length) return;

    // Create WaveSurfer instance
    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      height,
      waveColor: color,
      progressColor,
      normalize: true,
      interact: false, // Disable interaction since we're just displaying
      cursorWidth: 0,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      fillParent: true,
      minPxPerSec: 1,
      mediaControls: false,
      autoplay: false,
      backend: "MediaElement",
      peaks: [new Float32Array(waveformData)],
      url: "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA", // Tiny silent audio file
    });

    console.log("WaveSurfer instance:", wavesurfer);

    wavesurferRef.current = wavesurfer;

    // Cleanup on unmount
    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
    };
  }, [waveformData, height, color, progressColor]);

  return (
    <div
      ref={containerRef}
      className="w-full"
      style={{ minHeight: `${height}px` }}
    />
  );
}
