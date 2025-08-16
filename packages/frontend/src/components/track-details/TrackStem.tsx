import { Stem } from "@/types";
import { useTrack } from "@/pages/TrackDetails/contexts/TrackContext";
import { TrackDetailsWaveform } from "@/pages/TrackDetails/components/TrackDetailsWaveform";
import { StemDownloadButtons } from "./DownloadLink";
import { getAudioUrl } from "../../hooks/useAuthToken";
import { styles } from "../../styles/common";
import { StemManagement } from "./StemManagement";
import { useAuth } from "@/contexts/AuthContext";

interface TrackStemProps {
  stem: Stem;
  isGridView: boolean;
}

export function TrackStem({ stem, isGridView }: TrackStemProps) {
  const { track } = useTrack();
  const { user } = useAuth();

  const canEdit = !!(user && track.userId === user.id && track.isFork);

  return (
    <div
      className={`${styles.container.card} ${
        isGridView ? "shadow-sm" : "shadow flex flex-col"
      }`}
    >
      <div className={`${styles.container.flexBetween} mb-4`}>
        <div className="flex-1">
          <h3
            className={`${isGridView ? "font-medium" : "text-lg font-medium"}`}
          >
            {stem.name}
          </h3>
          {stem.type && (
            <p className="text-sm text-gray-600 mt-1">{stem.type}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <StemDownloadButtons track={track} stem={stem} />
          <StemManagement track={track} stem={stem} canEdit={canEdit} />
        </div>
      </div>
      <TrackDetailsWaveform
        trackId={track.id}
        stemId={stem.id}
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
