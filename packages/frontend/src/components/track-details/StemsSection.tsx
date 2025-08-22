import { useTrack } from "@/pages/TrackDetails/contexts/TrackContext";
import { PlayModeToggle } from "./PlayModeToggle";
import { ViewModeToggle, ViewMode } from "./ViewModeToggle";
import { TrackStem } from "./TrackStem";
import { AddStemButton } from "./AddStemButton";
import { useAuth } from "@/contexts/AuthContext";
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
  const { user } = useAuth();

  const canEdit = !!(user && track.userId === user.id && track.isFork);

  return (
    <div className={styles.layout.stack}>
      <div className={styles.container.flexBetween}>
        <h2 className={styles.text.heading}>Stems</h2>
        <div className={styles.container.flexRow}>
          <AddStemButton track={track} canEdit={canEdit} />
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
