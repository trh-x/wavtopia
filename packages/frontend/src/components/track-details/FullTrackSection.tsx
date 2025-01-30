import { Track } from "@/types";
import { SyncedWaveform } from "../waveform/SyncedWaveform";
import { DownloadLink, ConvertAudioFile } from "./DownloadLink";
import { getAudioUrl } from "../../hooks/useAuthToken";
import { styles } from "../../styles/common";
import { TrackWaveformPlaceholder } from "../track-list/TrackList";

interface AudioFileDownloadButtonProps {
  track: Track;
  format: "wav" | "flac";
}

function AudioFileDownloadButton({
  track,
  format,
}: AudioFileDownloadButtonProps) {
  const downloadProps = {
    href: `/api/track/${track.id}/full.${format}`,
    children: format === "wav" ? "WAV" : "FLAC",
  };

  if (track.fullTrackWavUrl) {
    return <DownloadLink {...downloadProps} />;
  }

  return (
    <ConvertAudioFile
      {...downloadProps}
      trackId={track.id}
      type="full"
      format={format}
    />
  );
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
        <AudioFileDownloadButton track={track} format="wav" />
        <AudioFileDownloadButton track={track} format="flac" />
        <DownloadLink href={`/api/track/${track.id}/full.mp3`}>
          MP3
        </DownloadLink>
      </div>
    </div>
  );
}
