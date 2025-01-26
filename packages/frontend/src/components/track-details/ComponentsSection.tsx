import { Track } from "@/types";
import { ViewModeToggle, ViewMode } from "./ViewModeToggle";
import { TrackComponent } from "./TrackComponent";
import { styles } from "../../styles/common";

interface ComponentsSectionProps {
  track: Track;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ComponentsSection({
  track,
  viewMode,
  onViewModeChange,
}: ComponentsSectionProps) {
  return (
    <div className={styles.layout.stack}>
      <div className={styles.container.flexBetween}>
        <h2 className={styles.text.heading}>Components</h2>
        <ViewModeToggle
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
        />
      </div>

      <div
        className={
          viewMode === "grid" ? styles.layout.grid : styles.layout.stack
        }
      >
        {track.components.map((component) => (
          <TrackComponent
            key={component.id}
            component={component}
            track={track}
            isGridView={viewMode === "grid"}
          />
        ))}
      </div>
    </div>
  );
}
