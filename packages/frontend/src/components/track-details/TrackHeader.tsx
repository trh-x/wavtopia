import { TrackCoverArt } from "../track-list/TrackList";
import { formatDuration } from "@/utils/formatDuration";
import { LicenseInfo } from "./LicenseInfo";
import { useTrack } from "@/pages/TrackDetails/contexts/TrackContext";

export function TrackHeader() {
  const { track } = useTrack();

  return (
    <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
      <div className="shrink-0">
        <TrackCoverArt
          coverArt={track.coverArt}
          trackId={track.id}
          title={track.title}
          size="lg"
        />
      </div>
      <div className="flex-1 min-w-0">
        {/* Title section */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold sm:leading-tight">
              {track.title}
            </h1>
            <p className="text-gray-600 mt-2 text-lg">
              {track.primaryArtistName}
            </p>
          </div>

          {/* License, explicit badge, and duration */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {track.isExplicit && (
              <span className="shrink-0 px-2 py-0.5 bg-red-50 text-red-600 rounded text-sm font-medium">
                Explicit
              </span>
            )}
            <div className="flex items-center gap-3 sm:gap-4">
              <LicenseInfo />
              <span className="text-base sm:text-lg text-gray-500">
                {formatDuration(track.duration)}
              </span>
            </div>
          </div>
        </div>

        {/* Metadata section */}
        <div className="mt-6 mb-6">
          <div className="flex flex-wrap gap-2 mb-3">
            {track.originalFormat && (
              <span
                className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-medium text-sm"
                title="Track Format"
              >
                {track.originalFormat.toUpperCase()}
              </span>
            )}
            {track.bpm && (
              <span
                className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-medium text-sm"
                title="Tempo"
              >
                {track.bpm} BPM
              </span>
            )}
            {track.key && (
              <span
                className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-medium text-sm"
                title="Musical Key"
              >
                {track.key}
              </span>
            )}
          </div>

          {track.genreNames && track.genreNames.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {track.genreNames.map((genre) => (
                <span
                  key={genre}
                  className="text-sm text-blue-500 hover:text-blue-600 transition-colors"
                >
                  #{genre}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
