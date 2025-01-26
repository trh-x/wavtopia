import { Track } from "@/types";
import { SyncedWaveform } from "../waveform/SyncedWaveform";
import { DownloadLink } from "./DownloadLink";
import { getAudioUrl } from "../../hooks/useAuthToken";
import { styles } from "../../styles/common";
import { TrackWaveformPlaceholder } from "../track-list/TrackList";

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
        <DownloadLink
          href={`/api/track/${track.id}/original`}
          trackId={track.id}
          type="full"
        >
          Download Original {track.originalFormat.toUpperCase()} File
        </DownloadLink>
        <div className="flex space-x-4">
          <DownloadLink
            href={`/api/track/${track.id}/full.wav`}
            trackId={track.id}
            type="full"
          >
            WAV
          </DownloadLink>
          <DownloadLink
            href={`/api/track/${track.id}/full.mp3`}
            trackId={track.id}
            type="full"
          >
            MP3
          </DownloadLink>
          <DownloadLink
            href={`/api/track/${track.id}/full.flac`}
            trackId={track.id}
            type="full"
          >
            FLAC
          </DownloadLink>
        </div>
      </div>
    </div>
  );
}
