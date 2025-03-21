import { useTrack } from "@/pages/TrackDetails/contexts/TrackContext";
import { PlayModeToggle } from "./PlayModeToggle";
import { ViewModeToggle, ViewMode } from "./ViewModeToggle";
import { TrackStem } from "./TrackStem";
import { styles } from "../../styles/common";

interface StemsSectionProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function StemsSection({
  viewMode,
  onViewModeChange,
}: StemsSectionProps) {
  const { track } = useTrack();

  return (
    <div className={styles.layout.stack}>
      <div className={styles.container.flexBetween}>
        <h2 className={styles.text.heading}>Stems</h2>
        <div className={styles.container.flexRow}>
          <PlayModeToggle />
          <ViewModeToggle
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
          />
        </div>
      </div>

      <div
        className={
          viewMode === "grid" ? styles.layout.grid : styles.layout.stack
        }
      >
        {track.stems
          .sort((a, b) => a.index - b.index)
          .map((stem) => (
            <TrackStem
              key={stem.id}
              stem={stem}
              isGridView={viewMode === "grid"}
            />
          ))}
      </div>
    </div>
  );
}
