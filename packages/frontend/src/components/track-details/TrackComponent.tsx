import { Track, Component } from "@/types";
import { TrackDetailsWaveform } from "@/pages/TrackDetails/components/TrackDetailsWaveform";
import { ComponentDownloadButtons } from "./DownloadLink";
import { getAudioUrl } from "../../hooks/useAuthToken";
import { styles } from "../../styles/common";

interface TrackComponentProps {
  component: Component;
  track: Track;
  isGridView: boolean;
}

export function TrackComponent({
  component,
  track,
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
        </div>
        <ComponentDownloadButtons track={track} component={component} />
      </div>
      <TrackDetailsWaveform
        waveformData={component.waveformData}
        duration={component.duration ?? undefined}
        height={isGridView ? 48 : 64}
        color="#4b5563"
        progressColor="#6366f1"
        audioUrl={getAudioUrl(
          `/api/track/${track.id}/component/${component.id}.mp3`
        )}
      />
    </div>
  );
}
