import { TrackCoverArt } from "../track-list/TrackList";

interface TrackHeaderProps {
  title: string;
  artist: string;
  coverArt?: string | null;
  trackId: string;
}

export function TrackHeader({
  title,
  artist,
  coverArt,
  trackId,
}: TrackHeaderProps) {
  return (
    <div className="flex items-center space-x-4 p-4">
      <TrackCoverArt
        coverArt={coverArt}
        trackId={trackId}
        title={title}
        size="lg"
      />
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-gray-600">{artist}</p>
      </div>
    </div>
  );
}
