import { Track, Stem } from "@/types";
import { TrackDetailsWaveform } from "@/pages/TrackDetails/components/TrackDetailsWaveform";
import { StemDownloadButtons } from "./DownloadLink";
import { getAudioUrl } from "../../hooks/useAuthToken";
import { styles } from "../../styles/common";

interface StemTrackProps {
  stem: Stem;
  track: Track;
  isGridView: boolean;
}

export function StemTrack({ stem, track, isGridView }: StemTrackProps) {
  return (
    <div
      className={`${styles.container.card} ${
        isGridView ? "shadow-sm" : "shadow flex flex-col"
      }`}
    >
      <div className={`${styles.container.flexBetween} mb-4`}>
        <div>
          <h3
            className={`${isGridView ? "font-medium" : "text-lg font-medium"}`}
          >
            {stem.name}
          </h3>
        </div>
        <StemDownloadButtons track={track} stem={stem} />
      </div>
      <TrackDetailsWaveform
        waveformData={stem.waveformData}
        duration={stem.duration ?? undefined}
        height={isGridView ? 48 : 64}
        color="#4b5563"
        progressColor="#6366f1"
        audioUrl={getAudioUrl(`/api/track/${track.id}/stem/${stem.id}.mp3`)}
      />
    </div>
  );
}
