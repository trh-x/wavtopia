import { TrackCoverArt } from "../track-list/TrackList";
import { formatDuration } from "@/utils/formatDuration";
import { LicenseInfo } from "./LicenseInfo";
import { useTrack } from "@/pages/TrackDetails/contexts/TrackContext";

export function TrackHeader() {
  const { track } = useTrack();

  return (
    <div className="flex gap-6">
      <TrackCoverArt
        coverArt={track.coverArt}
        trackId={track.id}
        title={track.title}
        size="lg"
      />
      <div className="flex-1">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">{track.title}</h1>
              {track.isExplicit && (
                <span className="shrink-0 px-2 py-0.5 bg-red-50 text-red-600 rounded text-sm font-medium">
                  Explicit
                </span>
              )}
            </div>
            <p className="text-gray-600 mb-3">{track.primaryArtistName}</p>

            {/* Metadata and genres */}
            <div className="space-y-2 mb-2">
              <div className="flex flex-wrap gap-2">
                {track.originalFormat && (
                  <span
                    className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium text-sm"
                    title="Track Format"
                  >
                    {track.originalFormat.toUpperCase()}
                  </span>
                )}
                {track.bpm && (
                  <span
                    className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium text-sm"
                    title="Tempo"
                  >
                    {track.bpm} BPM
                  </span>
                )}
                {track.key && (
                  <span
                    className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium text-sm"
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

          {/* License and duration */}
          <div className="flex items-center gap-4 ml-4 shrink-0">
            <LicenseInfo />
            <span className="text-lg text-gray-500">
              {formatDuration(track.duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
