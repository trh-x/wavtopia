import { memo } from "react";
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

const TrackStemComponent = function TrackStem({
  stem,
  isGridView,
}: TrackStemProps) {
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
        key={`${stem.id}-${stem.waveformData?.length || 0}`}
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
};

// Memoize the component to prevent unnecessary re-renders
export const TrackStem = memo(TrackStemComponent, (prevProps, nextProps) => {
  // Only re-render if the stem data or view mode actually changed
  const stemChanged =
    prevProps.stem.id !== nextProps.stem.id ||
    prevProps.stem.name !== nextProps.stem.name ||
    prevProps.stem.type !== nextProps.stem.type ||
    prevProps.stem.mp3Url !== nextProps.stem.mp3Url ||
    prevProps.stem.duration !== nextProps.stem.duration ||
    JSON.stringify(prevProps.stem.waveformData) !==
      JSON.stringify(nextProps.stem.waveformData);

  const viewModeChanged = prevProps.isGridView !== nextProps.isGridView;

  const shouldUpdate = stemChanged || viewModeChanged;

  return !shouldUpdate; // Return true to prevent re-render, false to allow re-render
});
