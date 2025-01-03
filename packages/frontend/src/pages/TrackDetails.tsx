import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Track } from "@/types";
import { useState } from "react";
import { PlaybackProvider } from "../contexts/PlaybackContext";
import { useAuthToken } from "../hooks/useAuthToken";
import { TrackHeader } from "../components/track-details/TrackHeader";
import { FullTrackSection } from "../components/track-details/FullTrackSection";
import { ComponentsSection } from "../components/track-details/ComponentsSection";
import { ViewMode } from "../components/track-details/ViewModeToggle";
import { LoadingState } from "../components/ui/LoadingState";
import { ErrorState } from "../components/ui/ErrorState";
import { api } from "../api/client";

export function TrackDetails() {
  const { id } = useParams<{ id: string }>();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const { getToken } = useAuthToken();

  const {
    data: track,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["track", id],
    queryFn: () => api.tracks.get(id!, getToken()!),
    enabled: !!id,
  });

  if (isLoading) {
    return <LoadingState message="Loading track details..." />;
  }

  if (error || !track) {
    return (
      <ErrorState
        message="Failed to load track details"
        retry={() => refetch()}
      />
    );
  }

  return (
    <PlaybackProvider>
      <div>
        <TrackHeader
          title={track.title}
          artist={track.artist}
          coverArt={track.coverArt}
        />
        <FullTrackSection track={track} />
        <ComponentsSection
          track={track}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>
    </PlaybackProvider>
  );
}
