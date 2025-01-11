import { useTrackListPlayback } from "@/contexts/TrackListPlaybackContext";
import { WaveformDisplay } from "./WaveformDisplay";

interface TrackListWaveformProps {
  waveformData: number[];
  audioUrl: string;
  height?: number;
  color?: string;
  progressColor?: string;
}

export function TrackListWaveform({
  waveformData,
  audioUrl,
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
      height={height}
      color={color}
      progressColor={progressColor}
      isFullTrack={true}
    />
  );
}
