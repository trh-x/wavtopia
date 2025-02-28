import { Track } from "@/types";
import { DownloadLink, ConvertAudioFile } from "./DownloadLink";
import { getAudioUrl } from "../../hooks/useAuthToken";
import { styles } from "../../styles/common";
import { TrackWaveformPlaceholder } from "../track-list/TrackList";
import { TrackDetailsWaveform } from "@/pages/TrackDetails/components/TrackDetailsWaveform";

interface AudioFileDownloadButtonProps {
  track: Track;
  format: "wav" | "flac";
}

function AudioFileDownloadButton({
  track,
  format,
}: AudioFileDownloadButtonProps) {
  const downloadProps = {
    href: `/api/track/${track.id}/full.${format}?attachment`,
    children: format === "wav" ? "WAV" : "FLAC",
    usePresigned: true,
  };

  const audioFileUrl =
    format === "wav" ? track.fullTrackWavUrl : track.fullTrackFlacUrl;

  if (audioFileUrl) {
    return <DownloadLink {...downloadProps} />;
  }

  return (
    <ConvertAudioFile
      {...downloadProps}
      track={track}
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
          <TrackDetailsWaveform
            waveformData={track.waveformData}
            duration={track.duration ?? undefined}
            height={96}
            audioUrl={getAudioUrl(`/api/track/${track.id}/full.mp3`)}
            isFullTrack
            preloadMetadata // Irrelevant for synced playback where the full track is loaded
          />
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-4">
        <DownloadLink href={`/api/track/${track.id}/original`}>
          Download Original {track.originalFormat.toUpperCase()} File
        </DownloadLink>
        <DownloadLink
          href={`/api/track/${track.id}/full.mp3?attachment`}
          usePresigned
        >
          MP3
        </DownloadLink>
        <AudioFileDownloadButton track={track} format="flac" />
        <AudioFileDownloadButton track={track} format="wav" />
      </div>
    </div>
  );
}
