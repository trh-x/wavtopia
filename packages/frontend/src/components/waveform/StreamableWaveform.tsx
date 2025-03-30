import { useTrackListPlayback } from "@/contexts/TrackListPlaybackContext";
import { WaveformDisplay } from "./WaveformDisplay";

export interface StreamableWaveformProps {
  trackId: string;
  stemId?: string;
  waveformData: number[];
  audioUrl: string;
  duration?: number;
  preloadMetadata?: boolean;
  height?: number;
  color?: string;
  progressColor?: string;
}

export function StreamableWaveform({
  trackId,
  stemId,
  waveformData,
  audioUrl,
  duration,
  preloadMetadata = false,
  height = 48,
  color = "#4b5563",
  progressColor = "#6366f1",
}: StreamableWaveformProps) {
  const trackListContext = useTrackListPlayback();

  return (
    <WaveformDisplay
      trackId={trackId}
      stemId={stemId}
      context={trackListContext}
      waveformData={waveformData}
      audioUrl={audioUrl}
      duration={duration}
      height={height}
      color={color}
      progressColor={progressColor}
      isFullTrack={true}
      preloadMetadata={preloadMetadata}
      isStreamable={true}
    />
  );
}
