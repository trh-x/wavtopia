import { usePlayback } from "@/contexts/PlaybackContext";
import { WaveformDisplay } from "./WaveformDisplay";

interface SyncedWaveformProps {
  waveformData: number[];
  audioUrl: string;
  height?: number;
  color?: string;
  progressColor?: string;
  isFullTrack?: boolean;
}

export function SyncedWaveform({
  waveformData,
  audioUrl,
  height = 128,
  color = "#1f2937",
  progressColor = "#4f46e5",
  isFullTrack = false,
}: SyncedWaveformProps) {
  const playbackContext = usePlayback();

  return (
    <WaveformDisplay
      context={playbackContext}
      waveformData={waveformData}
      audioUrl={audioUrl}
      height={height}
      color={color}
      progressColor={progressColor}
      isFullTrack={isFullTrack}
    />
  );
}
