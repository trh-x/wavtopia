import { useSyncedPlayback } from "@/contexts/SyncedPlaybackContext";
import { WaveformDisplay } from "./WaveformDisplay";

interface SyncedWaveformProps {
  waveformData: number[];
  audioUrl: string;
  duration?: number;
  height?: number;
  color?: string;
  progressColor?: string;
  isFullTrack?: boolean;
}

export function SyncedWaveform({
  waveformData,
  audioUrl,
  duration,
  height = 128,
  color = "#1f2937",
  progressColor = "#4f46e5",
  isFullTrack = false,
}: SyncedWaveformProps) {
  const playbackContext = useSyncedPlayback();

  return (
    <WaveformDisplay
      context={playbackContext}
      waveformData={waveformData}
      audioUrl={audioUrl}
      duration={duration}
      height={height}
      color={color}
      progressColor={progressColor}
      isFullTrack={isFullTrack}
    />
  );
}
