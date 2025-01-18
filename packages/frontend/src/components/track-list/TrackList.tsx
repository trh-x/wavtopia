import { Link } from "react-router-dom";
import { Track } from "@/types";
import { LoadingState } from "../ui/LoadingState";
import { ErrorState } from "../ui/ErrorState";
import { useAuthToken } from "@/hooks/useAuthToken";
import { TrackListWaveform } from "../waveform/TrackListWaveform";
import { TrackListPlaybackProvider } from "@/contexts/TrackListPlaybackContext";
import { cn } from "@/utils/cn";
import { Checkbox } from "../ui/Checkbox";
import { TrackCardMenu } from "./TrackCardMenu";
import { useEffect, useRef, useCallback } from "react";

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

interface TrackListProps {
  tracks: Track[];
  selectable?: boolean;
  selectedTracks?: Set<string>;
  onTrackSelect?: (trackId: string) => void;
  onDeleteTrack?: (trackId: string) => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

export function TrackList({
  tracks,
  selectable = false,
  selectedTracks,
  onTrackSelect,
  onDeleteTrack,
  onLoadMore,
  isLoadingMore,
}: TrackListProps) {
  const { appendTokenToUrl } = useAuthToken();
  const observerTarget = useRef<HTMLDivElement>(null);

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

  if (!tracks?.length)
    return <div className="text-gray-500">No tracks found</div>;

  return (
    <TrackListPlaybackProvider>
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
            <Link to={`/track/${track.id}`} className="block">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center space-x-4">
                  <TrackCoverArt
                    coverArt={track.coverArt}
                    trackId={track.id}
                    title={track.title}
                    size="sm"
                  />
                  <div className="flex-1">
                    <h3 className="font-medium">{track.title}</h3>
                    <p className="text-sm text-gray-600">{track.artist}</p>
                    <p className="text-xs text-gray-500">
                      by {track.user.username}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
            {track.originalUrl?.startsWith("file://") ? (
              <TrackWaveformPlaceholder height={48} />
            ) : (
              <TrackListWaveform
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

interface TrackSectionProps {
  title: string;
  tracks: Track[];
  isLoading: boolean;
  error: unknown;
  selectable?: boolean;
  selectedTracks?: Set<string>;
  onTrackSelect?: (trackId: string) => void;
  onDeleteTrack?: (trackId: string) => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

export function TrackSection({
  title,
  tracks,
  isLoading,
  error,
  selectable,
  selectedTracks,
  onTrackSelect,
  onDeleteTrack,
  onLoadMore,
  isLoadingMore,
}: TrackSectionProps) {
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={(error as Error).message} />;

  return (
    <div className="mb-12">
      <h2 className="text-2xl font-bold mb-6">{title}</h2>
      <TrackList
        tracks={tracks || []}
        selectable={selectable}
        selectedTracks={selectedTracks}
        onTrackSelect={onTrackSelect}
        onDeleteTrack={onDeleteTrack}
        onLoadMore={onLoadMore}
        isLoadingMore={isLoadingMore}
      />
    </div>
  );
}
