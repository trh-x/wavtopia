import {
  TrackListWaveform,
  TrackListWaveformProps,
} from "@/components/waveform/TrackListWaveform";
import {
  SyncedWaveform,
  SyncedWaveformProps,
} from "@/components/waveform/SyncedWaveform";
import { PlaybackContext } from "../contexts/PlaybackContext";
import { useContext } from "react";

export type TrackDetailsWaveformProps = TrackListWaveformProps &
  SyncedWaveformProps;

export function TrackDetailsWaveform({
  waveformData,
  audioUrl,
  duration,
  height,
  color,
  progressColor,
  isFullTrack,
}: TrackDetailsWaveformProps) {
  const playbackContext = useContext(PlaybackContext);

  if (!playbackContext) {
    return null;
  }

  return playbackContext.playMode === "preview" ? (
    <TrackListWaveform
      waveformData={waveformData}
      audioUrl={audioUrl}
      duration={duration}
      height={height}
      color={color}
      progressColor={progressColor}
    />
  ) : (
    <SyncedWaveform
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
