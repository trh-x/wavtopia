import { useTrackListPlayback } from "@/contexts/TrackListPlaybackContext";
import { WaveformDisplay } from "./WaveformDisplay";

export interface TrackListWaveformProps {
  waveformData: number[];
  audioUrl: string;
  duration?: number;
  height?: number;
  color?: string;
  progressColor?: string;
}

export function TrackListWaveform({
  waveformData,
  audioUrl,
  duration,
  height = 48,
  color = "#4b5563",
  progressColor = "#6366f1",
}: TrackListWaveformProps) {
  const trackListContext = useTrackListPlayback();

  return (
    <WaveformDisplay
      context={trackListContext}
      waveformData={waveformData}
      audioUrl={audioUrl}
      duration={duration}
      height={height}
      color={color}
      progressColor={progressColor}
      isFullTrack={true}
    />
  );
}
