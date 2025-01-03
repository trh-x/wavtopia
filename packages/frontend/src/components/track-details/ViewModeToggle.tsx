import { styles } from "../../styles/common";

export type ViewMode = "grid" | "list";

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ViewModeToggle({
  viewMode,
  onViewModeChange,
}: ViewModeToggleProps) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onViewModeChange("grid")}
        className={`${styles.button.base} ${
          viewMode === "grid" ? styles.button.active : styles.button.inactive
        }`}
      >
        Grid View
      </button>
      <button
        onClick={() => onViewModeChange("list")}
        className={`${styles.button.base} ${
          viewMode === "list" ? styles.button.active : styles.button.inactive
        }`}
      >
        List View
      </button>
    </div>
  );
}
