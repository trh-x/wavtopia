import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useState } from "react";
import { useAuthToken } from "../../hooks/useAuthToken";
import { TrackHeader } from "../../components/track-details/TrackHeader";
import { FullTrackSection } from "../../components/track-details/FullTrackSection";
import { StemsSection } from "../../components/track-details/StemsSection";
import { ViewMode } from "../../components/track-details/ViewModeToggle";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { api } from "../../api/client";
import { TrackSharingControls } from "../../components/track-details/TrackSharingControls";
import { useAuth } from "@/contexts/AuthContext";
import { TrackDetailsPlaybackProvider } from "./contexts/PlaybackContext";
import { TrackProvider } from "./contexts/TrackContext";

export function TrackDetails() {
  const { id } = useParams<{ id: string }>();
  // TODO: Move viewMode state to StemsSection if it's only used there
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
    queryFn: async () => {
      console.log(`🔄 TrackDetails: Fetching track data for track ${id}`);
      const result = await api.track.get(id!, token);
      console.log(`✅ TrackDetails: Track data received:`, {
        trackId: result.id,
        stemsCount: result.stems.length,
        stemIds: result.stems.map((s) => s.id),
        stemNames: result.stems.map((s) => s.name),
      });
      return result;
    },
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
    <TrackDetailsPlaybackProvider>
      <TrackProvider value={{ track, isLoading, error, refetch }}>
        <div>
          <TrackHeader />
          <FullTrackSection />
          <StemsSection viewMode={viewMode} onViewModeChange={setViewMode} />

          {/* If the current user doesn't own the track, don't render the sharing controls */}
          {token && user && track.userId === user.id && (
            <TrackSharingControls token={token} />
          )}
        </div>
      </TrackProvider>
    </TrackDetailsPlaybackProvider>
  );
}
