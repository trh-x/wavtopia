import { useSyncedPlayback } from "@/contexts/SyncedPlaybackContext";
import { WaveformDisplay } from "./WaveformDisplay";

export interface SyncedWaveformProps {
  waveformData: number[];
  audioUrl: string;
  duration?: number;
  height?: number;
  color?: string;
  progressColor?: string;
  isFullTrack?: boolean;
  trackId: string;
  stemId?: string;
}

export function SyncedWaveform({
  trackId,
  stemId,
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
      trackId={trackId}
      stemId={stemId}
      context={playbackContext}
      waveformData={waveformData}
      audioUrl={audioUrl}
      duration={duration}
      height={height}
      color={color}
      progressColor={progressColor}
      isFullTrack={isFullTrack}
      isStreamable={false}
    />
  );
}
