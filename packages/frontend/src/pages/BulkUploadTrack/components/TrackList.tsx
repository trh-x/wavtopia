import { cn } from "@/utils/cn";
import { FileMatch, DraggedCoverArt } from "../utils/types";

interface TrackListProps {
  matches: FileMatch[];
  currentUploadIndex: number;
  draggedCoverArt: DraggedCoverArt | null;
  onRemoveTrack: (path: string) => void;
  onUnmatchCoverArt: (path: string) => void;
  onCoverArtDragStart: (path: string, file: File) => void;
  onCoverArtDragEnd: () => void;
  onCoverArtDrop: (targetPath: string) => void;
}

export function TrackList({
  matches,
  currentUploadIndex,
  draggedCoverArt,
  onRemoveTrack,
  onUnmatchCoverArt,
  onCoverArtDragStart,
  onCoverArtDragEnd,
  onCoverArtDrop,
}: TrackListProps) {
  if (matches.length === 0) return null;

  return (
    <div className="border rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-4">
        Found {matches.length} tracks:
      </h2>
      <ul className="space-y-4">
        {matches.map((match, i) => (
          <li
            key={match.path}
            className={cn(
              "flex items-center space-x-4 p-3 rounded-lg border",
              match.uploaded
                ? "border-green-200 bg-green-50"
                : i < currentUploadIndex
                ? "border-green-200 bg-green-50"
                : i === currentUploadIndex
                ? "border-blue-200 bg-blue-50"
                : draggedCoverArt &&
                  match.path !== draggedCoverArt.sourceId &&
                  !match.uploaded
                ? "border-primary-200 bg-primary-50"
                : "border-gray-200"
            )}
            onDragOver={(e) => {
              if (!match.uploaded) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            onDrop={(e) => {
              if (!match.uploaded) {
                e.preventDefault();
                e.stopPropagation();
                onCoverArtDrop(match.path);
              }
            }}
          >
            <div className="flex-grow flex items-center space-x-2">
              <span className="font-medium">{match.title}</span>
              {match.uploaded ? (
                <span className="text-sm text-green-600">(Uploaded)</span>
              ) : (
                <button
                  type="button"
                  onClick={() => onRemoveTrack(match.path)}
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {match.uploaded ? (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">
                    {match.coverArt ? match.coverArt.name : "No cover art"}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveTrack(match.path)}
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              ) : match.coverArt ? (
                <div
                  className="flex items-center space-x-2 cursor-move"
                  draggable
                  onDragStart={() =>
                    onCoverArtDragStart(match.path, match.coverArt!)
                  }
                  onDragEnd={onCoverArtDragEnd}
                >
                  <span className="text-sm text-gray-500">
                    {match.coverArt.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUnmatchCoverArt(match.path)}
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
                </div>
              ) : (
                <span className="text-sm text-gray-500">
                  {draggedCoverArt &&
                  match.path !== draggedCoverArt.sourceId &&
                  !match.uploaded
                    ? "Drop cover art here"
                    : "No cover art"}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
