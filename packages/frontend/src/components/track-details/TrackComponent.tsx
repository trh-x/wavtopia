import { Track } from "@/types";
import { SyncedWaveform } from "../waveform/SyncedWaveform";
import { ComponentDownloadButtons } from "./DownloadLink";
import { getAudioUrl } from "../../hooks/useAuthToken";
import { styles } from "../../styles/common";

interface TrackComponentProps {
  component: Track["components"][0];
  trackId: string;
  isGridView: boolean;
}

export function TrackComponent({
  component,
  trackId,
  isGridView,
}: TrackComponentProps) {
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
            {component.name}
          </h3>
          {isGridView && <p className={styles.text.label}>{component.type}</p>}
        </div>
        <ComponentDownloadButtons
          trackId={trackId}
          componentId={component.id}
        />
      </div>
      <SyncedWaveform
        waveformData={component.waveformData}
        duration={component.duration ?? undefined}
        height={isGridView ? 48 : 64}
        color="#4b5563"
        progressColor="#6366f1"
        audioUrl={getAudioUrl(
          `/api/track/${trackId}/component/${component.id}.mp3`
        )}
      />
    </div>
  );
}
