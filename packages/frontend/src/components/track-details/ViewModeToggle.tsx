import { Switch } from "../ui/Switch";

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
    <div className="inline-flex rounded-lg border border-gray-200 p-1 text-sm">
      <button
        onClick={() => onViewModeChange("grid")}
        className={`relative rounded-md px-3 py-1.5 transition-colors duration-200 ${
          viewMode === "grid"
            ? "bg-primary-600 text-white"
            : "text-gray-600 hover:text-gray-900"
        }`}
      >
        Grid
      </button>
      <button
        onClick={() => onViewModeChange("list")}
        className={`relative rounded-md px-3 py-1.5 transition-colors duration-200 ${
          viewMode === "list"
            ? "bg-primary-600 text-white"
            : "text-gray-600 hover:text-gray-900"
        }`}
      >
        List
      </button>
    </div>
  );
}
