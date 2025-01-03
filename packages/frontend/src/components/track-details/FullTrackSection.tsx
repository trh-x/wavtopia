import { Track } from "@/types";
import { WaveformDisplay } from "../WaveformDisplay";
import { DownloadLink } from "./DownloadLink";
import { getAudioUrl } from "../../hooks/useAuthToken";
import { styles } from "../../styles/common";

interface FullTrackSectionProps {
  track: Track;
}

export function FullTrackSection({ track }: FullTrackSectionProps) {
  return (
    <div className={styles.container.section}>
      <div className={styles.container.card}>
        <WaveformDisplay
          waveformData={track.waveformData}
          height={96}
          audioUrl={getAudioUrl(`/api/tracks/${track.id}/full.mp3`)}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-4">
        <DownloadLink href={`/api/tracks/${track.id}/original`}>
          Download Original {track.originalFormat.toUpperCase()} File
        </DownloadLink>
        <DownloadLink href={`/api/tracks/${track.id}/full`}>WAV</DownloadLink>
        <DownloadLink href={`/api/tracks/${track.id}/full.mp3`}>
          MP3
        </DownloadLink>
      </div>
    </div>
  );
}
