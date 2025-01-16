import { cn } from "@/utils/cn";
import { DraggedCoverArt } from "../utils/types";

interface UnmatchedArtProps {
  unmatchedCoverArt: File[];
  draggedCoverArt: DraggedCoverArt | null;
  onRemoveArt: (index: number) => void;
  onDragStart: (sourceId: string, file: File) => void;
  onDragEnd: () => void;
  onDrop: () => void;
}

export function UnmatchedArt({
  unmatchedCoverArt,
  draggedCoverArt,
  onRemoveArt,
  onDragStart,
  onDragEnd,
  onDrop,
}: UnmatchedArtProps) {
  if (unmatchedCoverArt.length === 0) return null;

  return (
    <div
      className={cn(
        "border rounded-lg p-4",
        draggedCoverArt && !draggedCoverArt.sourceId.startsWith("unmatched-")
          ? "border-primary-200 bg-primary-50"
          : ""
      )}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDrop();
      }}
    >
      <h2 className="text-lg font-semibold mb-4">
        {draggedCoverArt && !draggedCoverArt.sourceId.startsWith("unmatched-")
          ? "Drop here to add to unmatched cover art"
          : "Unmatched Cover Art:"}
      </h2>
      <ul className="space-y-2">
        {unmatchedCoverArt.map((file, index) => (
          <li
            key={index}
            className="flex items-center justify-between p-2 border rounded"
            draggable
            onDragStart={() => {
              onDragStart(`unmatched-${index}`, file);
            }}
            onDragEnd={onDragEnd}
          >
            <span className="text-sm text-gray-600">{file.name}</span>
            <button
              type="button"
              onClick={() => onRemoveArt(index)}
              className="text-red-500 hover:text-red-700"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
