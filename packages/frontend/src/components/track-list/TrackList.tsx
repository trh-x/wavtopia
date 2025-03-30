import { Link } from "react-router-dom";
import { Track } from "@/types";
import { LoadingState } from "../ui/LoadingState";
import { ErrorState } from "../ui/ErrorState";
import { useAuthToken } from "@/hooks/useAuthToken";
import { StreamableWaveform } from "../waveform/StreamableWaveform";
import { TrackListPlaybackProvider } from "@/contexts/TrackListPlaybackContext";
import { cn } from "@/utils/cn";
import { Checkbox } from "../ui/Checkbox";
import { TrackCardMenu } from "./TrackCardMenu";
import { useEffect, useRef, useCallback } from "react";
import { TrackMetadata, GenreList } from "../ui/TrackMetadata";
import { ChartBarIcon } from "@heroicons/react/24/outline";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/Select";
import { LicenseInfo } from "../track-details/LicenseInfo";
import { ReleaseDate } from "../ui/ReleaseDate";
import { useAuth } from "@/contexts/AuthContext";
import {
  PublicTrackIcon,
  PrivateTrackIcon,
  TrackOwnerIcon,
} from "./TrackIcons";

interface SortOption {
  label: string;
  value: string;
  field: "createdAt" | "title" | "duration" | "primaryArtistName";
  direction: "asc" | "desc";
}

const sortOptions: SortOption[] = [
  {
    label: "Newest First",
    value: "newest",
    field: "createdAt",
    direction: "desc",
  },
  {
    label: "Oldest First",
    value: "oldest",
    field: "createdAt",
    direction: "asc",
  },
  { label: "Title A-Z", value: "titleAsc", field: "title", direction: "asc" },
  { label: "Title Z-A", value: "titleDesc", field: "title", direction: "desc" },
  {
    label: "Duration (Shortest)",
    value: "durationAsc",
    field: "duration",
    direction: "asc",
  },
  {
    label: "Duration (Longest)",
    value: "durationDesc",
    field: "duration",
    direction: "desc",
  },
  {
    label: "Artist A-Z",
    value: "artistAsc",
    field: "primaryArtistName",
    direction: "asc",
  },
  {
    label: "Artist Z-A",
    value: "artistDesc",
    field: "primaryArtistName",
    direction: "desc",
  },
];

function ImagePlaceholderIcon({
  className = "w-8 h-8 text-gray-400",
}: {
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
      />
    </svg>
  );
}

interface TrackCoverArtProps {
  coverArt: string | null | undefined;
  trackId: string;
  title: string;
  size?: "sm" | "lg";
  className?: string;
}

export function TrackCoverArt({
  coverArt,
  trackId,
  title,
  size = "sm",
  className = "",
}: TrackCoverArtProps) {
  const { appendTokenToUrl } = useAuthToken();
  const dimensions = size === "sm" ? "h-16 w-16" : "h-24 w-24";
  const roundedStyle = size === "sm" ? "rounded" : "rounded-lg";

  if (!coverArt) return null;

  if (coverArt.startsWith("file://")) {
    return (
      <div
        className={`${dimensions} ${roundedStyle} bg-gray-100 flex items-center justify-center ${className}`}
      >
        <ImagePlaceholderIcon />
      </div>
    );
  }

  return (
    <img
      src={appendTokenToUrl(`/api/track/${trackId}/cover`)}
      alt={`${title} cover art`}
      className={`${dimensions} ${roundedStyle} object-cover ${className}`}
    />
  );
}

interface TrackWaveformPlaceholderProps {
  height?: number;
  className?: string;
}

export function TrackWaveformPlaceholder({
  height = 48,
  className = "",
}: TrackWaveformPlaceholderProps) {
  return (
    <div
      className={`h-${
        height / 4
      } bg-gray-100 rounded flex items-center justify-center ${className}`}
    >
      <span className="text-gray-400 text-sm">Processing audio...</span>
    </div>
  );
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "--:--";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function getEngagementLevel(plays: number, downloads: number): number {
  const total = plays + downloads;
  if (total === 0) return 0;
  if (total < 10) return 1;
  if (total < 50) return 2;
  return 3;
}

interface TrackListProps {
  tracks: Track[];
  isLoading?: boolean;
  error?: Error | null;
  selectable?: boolean;
  selectedTracks?: Set<string>;
  onTrackSelect?: (trackId: string) => void;
  onDeleteTrack?: (trackId: string) => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  onSort?: (
    field: SortOption["field"],
    direction: SortOption["direction"]
  ) => void;
  currentSort?: string;
  showVisibilityIcons?: boolean;
}

export function TrackList({
  tracks,
  isLoading,
  error,
  selectable = false,
  selectedTracks,
  onTrackSelect,
  onDeleteTrack,
  onLoadMore,
  isLoadingMore,
  onSort,
  currentSort = "newest",
  showVisibilityIcons = true,
}: TrackListProps) {
  const { appendTokenToUrl } = useAuthToken();
  const { user } = useAuth();
  const observerTarget = useRef<HTMLDivElement>(null);

  const handleSort = (value: string) => {
    const option = sortOptions.find((opt) => opt.value === value);
    if (option && onSort) {
      onSort(option.field, option.direction);
    }
  };

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && onLoadMore && !isLoadingMore) {
        onLoadMore();
      }
    },
    [onLoadMore, isLoadingMore]
  );

  useEffect(() => {
    const element = observerTarget.current;
    if (!element || !onLoadMore) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "20px",
      threshold: 1.0,
    });

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [handleObserver, onLoadMore]);

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={(error as Error).message} />;
  if (!tracks?.length)
    return <div className="text-gray-500">No tracks found</div>;

  return (
    <TrackListPlaybackProvider>
      {onSort && (
        <div className="mb-4">
          <Select value={currentSort} onValueChange={handleSort}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tracks.map((track) => (
          <div
            key={track.id}
            className={cn(
              "relative flex flex-col space-y-2 p-4 rounded-lg border transition-colors",
              {
                "border-primary-500 bg-primary-50/50": selectedTracks?.has(
                  track.id
                ),
                "border-gray-200": !selectedTracks?.has(track.id),
                "hover:bg-gray-50": !selectable,
              }
            )}
          >
            <div className="flex justify-between items-center">
              {selectable && onTrackSelect && (
                <Checkbox
                  checked={selectedTracks?.has(track.id)}
                  onCheckedChange={() => onTrackSelect(track.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                />
              )}
              {onDeleteTrack && (
                <TrackCardMenu onDelete={() => onDeleteTrack(track.id)} />
              )}
            </div>
            <Link to={`/track/${track.id}`} className="block group">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center space-x-4">
                  <TrackCoverArt
                    coverArt={track.coverArt}
                    trackId={track.id}
                    title={track.title}
                    size="sm"
                    className="transition-transform group-hover:scale-105"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <h3
                          className="font-semibold text-gray-900 truncate group-hover:text-primary-600 transition-colors"
                          title={track.title}
                        >
                          {track.title}
                        </h3>
                        <p
                          className="text-sm font-medium text-gray-700 truncate"
                          title={track.primaryArtistName ?? ""}
                        >
                          {track.primaryArtistName}
                        </p>
                        <p
                          className="text-xs text-gray-500 truncate"
                          title={`by ${track.user.username}`}
                        >
                          by {track.user.username}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            title="Track duration"
                            className="text-sm text-gray-500 shrink-0"
                          >
                            {formatDuration(track.duration)}
                          </span>
                          {(track.totalPlays > 0 ||
                            track.totalDownloads > 0) && (
                            <div
                              className="flex gap-0.5 items-end h-3"
                              title={`${track.totalPlays} plays, ${track.totalDownloads} downloads`}
                            >
                              <div
                                className={cn(
                                  "w-0.5 transition-all",
                                  getEngagementLevel(
                                    track.totalPlays,
                                    track.totalDownloads
                                  ) >= 1
                                    ? "h-1 bg-indigo-400"
                                    : "h-1 bg-gray-200"
                                )}
                              />
                              <div
                                className={cn(
                                  "w-0.5 transition-all",
                                  getEngagementLevel(
                                    track.totalPlays,
                                    track.totalDownloads
                                  ) >= 2
                                    ? "h-2 bg-indigo-400"
                                    : "h-2 bg-gray-200"
                                )}
                              />
                              <div
                                className={cn(
                                  "w-0.5 transition-all",
                                  getEngagementLevel(
                                    track.totalPlays,
                                    track.totalDownloads
                                  ) >= 3
                                    ? "h-3 bg-indigo-400"
                                    : "h-3 bg-gray-200"
                                )}
                              />
                            </div>
                          )}
                        </div>
                        <ReleaseDate
                          date={track.releaseDate}
                          precision={track.releaseDatePrecision}
                          size="sm"
                        />
                        <div className="flex items-center gap-1">
                          <LicenseInfo
                            track={track}
                            showText={false}
                            size="sm"
                            className="mr-0.5"
                          />
                          {showVisibilityIcons &&
                            (track.isPublic ? (
                              <PublicTrackIcon />
                            ) : (
                              <PrivateTrackIcon />
                            ))}
                          {user && track.userId === user.id && (
                            <TrackOwnerIcon />
                          )}
                        </div>
                      </div>
                    </div>

                    <TrackMetadata
                      format={track.originalFormat}
                      bpm={track.bpm ?? undefined}
                      musicalKey={track.key ?? undefined}
                      isExplicit={track.isExplicit}
                      size="sm"
                      className="mt-2"
                    />
                    <GenreList
                      genres={track.genreNames}
                      size="sm"
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </div>
            </Link>
            {track.originalUrl?.startsWith("file://") ? (
              <TrackWaveformPlaceholder height={48} />
            ) : (
              <StreamableWaveform
                trackId={track.id}
                waveformData={track.waveformData}
                duration={track.duration ?? undefined}
                audioUrl={appendTokenToUrl(`/api/track/${track.id}/full.mp3`)}
                height={48}
                color="#4b5563"
                progressColor="#6366f1"
              />
            )}
          </div>
        ))}
      </div>
      {onLoadMore && (
        <div ref={observerTarget} className="h-4 mt-4">
          {isLoadingMore && (
            <div className="text-center text-gray-500">Loading more...</div>
          )}
        </div>
      )}
    </TrackListPlaybackProvider>
  );
}
