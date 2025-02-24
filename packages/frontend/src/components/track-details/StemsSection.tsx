import { Track } from "@/types";
import { PlayModeToggle } from "./PlayModeToggle";
import { ViewModeToggle, ViewMode } from "./ViewModeToggle";
import { StemTrack } from "./StemTrack";
import { styles } from "../../styles/common";

interface StemsSectionProps {
  track: Track;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function StemsSection({
  track,
  viewMode,
  onViewModeChange,
}: StemsSectionProps) {
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
            <StemTrack
              key={stem.id}
              stem={stem}
              track={track}
              isGridView={viewMode === "grid"}
            />
          ))}
      </div>
    </div>
  );
}
