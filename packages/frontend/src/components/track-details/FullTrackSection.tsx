import { Track } from "@/types";
import { SyncedWaveform } from "../waveform/SyncedWaveform";
import {
  DownloadLink,
  DownloadLinkWav,
  DownloadLinkFlac,
} from "./DownloadLink";
import { getAudioUrl } from "../../hooks/useAuthToken";
import { styles } from "../../styles/common";
import { TrackWaveformPlaceholder } from "../track-list/TrackList";

interface WavDownloadButtonProps {
  track: Track;
}

function WavDownloadButton({ track }: WavDownloadButtonProps) {
  const downloadProps = {
    href: `/api/track/${track.id}/full.wav`,
    children: "WAV",
  };

  if (track.fullTrackWavUrl) {
    return <DownloadLink {...downloadProps} />;
  }

  return <DownloadLinkWav {...downloadProps} trackId={track.id} type="full" />;
}

interface FlacDownloadButtonProps {
  track: Track;
}

function FlacDownloadButton({ track }: FlacDownloadButtonProps) {
  const downloadProps = {
    href: `/api/track/${track.id}/full.flac`,
    children: "FLAC",
  };

  if (track.fullTrackFlacUrl) {
    return <DownloadLink {...downloadProps} />;
  }

  return <DownloadLinkFlac {...downloadProps} trackId={track.id} type="full" />;
}

interface FullTrackSectionProps {
  track: Track;
}

export function FullTrackSection({ track }: FullTrackSectionProps) {
  return (
    <div className={styles.container.section}>
      <div className={styles.container.card}>
        {track.originalUrl?.startsWith("file://") ? (
          <TrackWaveformPlaceholder height={96} />
        ) : (
          <SyncedWaveform
            waveformData={track.waveformData}
            duration={track.duration ?? undefined}
            height={96}
            audioUrl={getAudioUrl(`/api/track/${track.id}/full.mp3`)}
            isFullTrack={true}
          />
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-4">
        <DownloadLink href={`/api/track/${track.id}/original`}>
          Download Original {track.originalFormat.toUpperCase()} File
        </DownloadLink>
        <WavDownloadButton track={track} />
        <FlacDownloadButton track={track} />
        <DownloadLink href={`/api/track/${track.id}/full.mp3`}>
          MP3
        </DownloadLink>
      </div>
    </div>
  );
}
