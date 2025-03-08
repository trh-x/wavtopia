import { TrackCoverArt } from "../track-list/TrackList";
import { formatDuration } from "@/utils/formatDuration";

interface TrackHeaderProps {
  title: string;
  artistName: string | null;
  coverArt?: string | null;
  trackId: string;
  duration?: number | null;
}

export function TrackHeader({
  title,
  artistName,
  coverArt,
  trackId,
  duration,
}: TrackHeaderProps) {
  return (
    <div className="flex items-center space-x-4 p-4">
      <TrackCoverArt
        coverArt={coverArt}
        trackId={trackId}
        title={title}
        size="lg"
      />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{title}</h1>
          <span className="text-lg text-gray-500 ml-3">
            {formatDuration(duration)}
          </span>
        </div>
        <p className="text-gray-600">{artistName}</p>
      </div>
    </div>
  );
}
