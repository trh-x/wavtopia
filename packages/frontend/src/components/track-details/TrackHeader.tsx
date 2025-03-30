import { TrackCoverArt } from "../track-list/TrackList";
import { formatDuration } from "@/utils/formatDuration";
import { LicenseInfo } from "./LicenseInfo";
import { useTrack } from "@/pages/TrackDetails/contexts/TrackContext";
import { TrackMetadata, GenreList } from "../ui/TrackMetadata";
import { ReleaseDate } from "../ui/ReleaseDate";
import { TrackVisibilityToggle } from "./TrackVisibilityToggle";
import { useAuthToken } from "@/hooks/useAuthToken";
import { PlayIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";

export function TrackHeader() {
  const { track } = useTrack();
  const { getToken } = useAuthToken();
  const token = getToken();

  return (
    <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
      <TrackCoverArt
        coverArt={track.coverArt}
        trackId={track.id}
        title={track.title}
        size="lg"
      />
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Title and artist */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold sm:leading-tight">
              {track.title}
            </h1>
            <p className="text-gray-600 mt-2 text-lg">
              {track.primaryArtistName}
            </p>
          </div>

          {/* Track controls and stats */}
          <div className="flex flex-col items-start sm:items-end gap-4 shrink-0">
            {/* License and visibility */}
            <div className="flex items-center gap-3">
              <LicenseInfo track={track} />
              {token && <TrackVisibilityToggle token={token} size="sm" />}
            </div>

            {/* Track stats */}
            <div className="flex items-center gap-6 text-gray-600">
              <span title="Track duration" className="font-medium">
                {formatDuration(track.duration)}
              </span>
              <div className="flex items-center gap-1.5" title="Total plays">
                <PlayIcon className="h-4 w-4" />
                <span className="font-medium">
                  {track.totalPlays.toLocaleString()}
                </span>
              </div>
              <div
                className="flex items-center gap-1.5"
                title="Total downloads"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                <span className="font-medium">
                  {track.totalDownloads.toLocaleString()}
                </span>
              </div>
            </div>

            <ReleaseDate
              date={track.releaseDate}
              precision={track.releaseDatePrecision}
              size="md"
            />
          </div>
        </div>

        {/* Metadata section */}
        <div className="mt-6 mb-6 space-y-2">
          <TrackMetadata
            format={track.originalFormat}
            bpm={track.bpm ?? undefined}
            musicalKey={track.key ?? undefined}
            isExplicit={track.isExplicit}
            size="lg"
          />
          <GenreList genres={track.genreNames} size="md" />
          {track.description && (
            <p className="whitespace-pre-wrap">{track.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
