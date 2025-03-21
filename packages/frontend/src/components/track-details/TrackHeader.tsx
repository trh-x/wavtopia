import { TrackCoverArt } from "../track-list/TrackList";
import { formatDuration } from "@/utils/formatDuration";
import { LicenseInfo } from "./LicenseInfo";
import { useTrack } from "@/pages/TrackDetails/contexts/TrackContext";

export function TrackHeader() {
  const { track } = useTrack();

  return (
    <div className="flex items-center space-x-4 p-4">
      <TrackCoverArt
        coverArt={track.coverArt}
        trackId={track.id}
        title={track.title}
        size="lg"
      />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{track.title}</h1>
          <div className="flex items-center gap-4 ml-3">
            <LicenseInfo />
            <span className="text-lg text-gray-500">
              {formatDuration(track.duration)}
            </span>
          </div>
        </div>
        <p className="text-gray-600">{track.primaryArtistName}</p>
      </div>
    </div>
  );
}
