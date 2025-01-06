import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
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
import { TrackSharingControls } from "../components/track-details/TrackSharingControls";
import { useAuth } from "@/contexts/AuthContext";

export function TrackDetails() {
  const { id } = useParams<{ id: string }>();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const { getToken } = useAuthToken();
  const { user } = useAuth();

  const token = getToken();

  const {
    data: track,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["track", id],
    queryFn: () => api.track.get(id!, token),
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
          trackId={track.id}
        />
        <FullTrackSection track={track} />
        <ComponentsSection
          track={track}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* If the current user doesn't own the track, don't render the sharing controls */}
        {token && user && track.userId === user.id && (
          <TrackSharingControls track={track} token={token} />
        )}
      </div>
    </PlaybackProvider>
  );
}
