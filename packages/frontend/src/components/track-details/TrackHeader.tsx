import { TrackCoverArt } from "../track-list/TrackList";
import { formatDuration } from "@/utils/formatDuration";
import { LicenseInfo } from "./LicenseInfo";
import { useTrack } from "@/pages/TrackDetails/contexts/TrackContext";
import { TrackMetadata, GenreList } from "../ui/TrackMetadata";
import { ReleaseDate } from "../ui/ReleaseDate";

export function TrackHeader() {
  const { track } = useTrack();

  return (
    <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
      <TrackCoverArt
        coverArt={track.coverArt}
        trackId={track.id}
        title={track.title}
        size="lg"
      />
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

          {/* Duration, release date and license */}
          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-3 sm:gap-2 shrink-0">
            <span
              title="Track duration"
              className="text-base sm:text-lg text-gray-500 hover:text-gray-400 transition-colors cursor-default"
            >
              {formatDuration(track.duration)}
            </span>
            <ReleaseDate
              date={track.releaseDate}
              precision={track.releaseDatePrecision}
              size="md"
            />
            <LicenseInfo track={track} />
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
