import { Toggle } from "../ui/Toggle";

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
    <Toggle
      value={viewMode}
      options={[
        { value: "grid", label: "Grid" },
        { value: "list", label: "List" },
      ]}
      onChange={onViewModeChange}
    />
  );
}
