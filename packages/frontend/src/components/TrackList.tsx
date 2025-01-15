import { Track } from "@/types";
import { Checkbox } from "@/ui/Checkbox";
import { TrackActionsMenu } from "./TrackActionsMenu";
import { cn } from "@/utils/cn";

interface TrackListProps {
  title: string;
  tracks: Track[] | undefined;
  isLoading: boolean;
  error: unknown;
  selectable?: boolean;
  selectedTracks?: Set<string>;
  onTrackSelect?: (trackId: string) => void;
  onDeleteTrack?: (trackId: string) => void;
}

export function TrackList({
  title,
  tracks,
  isLoading,
  error,
  selectable = false,
  selectedTracks = new Set(),
  onTrackSelect,
  onDeleteTrack,
}: TrackListProps) {
  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {String(error)}</div>;
  }

  if (!tracks?.length) {
    return <div>No tracks found</div>;
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      <div className="space-y-2">
        {tracks.map((track) => (
          <div
            key={track.id}
            className={cn(
              "flex items-center gap-4 rounded-lg border p-4 transition-colors",
              selectable && selectedTracks.has(track.id) && "bg-gray-50"
            )}
          >
            {selectable && onTrackSelect && (
              <Checkbox
                checked={selectedTracks.has(track.id)}
                onCheckedChange={() => onTrackSelect(track.id)}
              />
            )}
            <div className="flex-1">
              <div className="font-medium">{track.title}</div>
              <div className="text-sm text-gray-500">{track.artist}</div>
            </div>
            {onDeleteTrack && (
              <TrackActionsMenu track={track} onDelete={onDeleteTrack} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
