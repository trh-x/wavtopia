import { TrackCoverArt } from "../track-list/TrackList";
import { formatDuration } from "@/utils/formatDuration";
import { LicenseInfo } from "./LicenseInfo";

interface TrackHeaderProps {
  title: string;
  artistName: string | null;
  coverArt?: string | null;
  trackId: string;
  duration?: number | null;
  licenseType: string | null;
  licenseId: string | null;
}

export function TrackHeader({
  title,
  artistName,
  coverArt,
  trackId,
  duration,
  licenseType,
  licenseId,
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
          <div className="flex items-center gap-4 ml-3">
            <LicenseInfo licenseType={licenseType} licenseId={licenseId} />
            <span className="text-lg text-gray-500">
              {formatDuration(duration)}
            </span>
          </div>
        </div>
        <p className="text-gray-600">{artistName}</p>
      </div>
    </div>
  );
}
