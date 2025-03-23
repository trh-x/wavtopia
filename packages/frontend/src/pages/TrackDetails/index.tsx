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
import { Link } from "react-router-dom";

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
    <TrackDetailsPlaybackProvider>
      <TrackProvider value={{ track, isLoading, error, refetch }}>
        <div>
          <TrackHeader />
          <FullTrackSection />
          <StemsSection viewMode={viewMode} onViewModeChange={setViewMode} />

          {/* If the current user doesn't own the track, don't render the sharing controls */}
          {token && user && track.userId === user.id && (
            <div className="space-y-4">
              <TrackSharingControls token={token} />
              <div className="flex justify-end">
                <Link
                  to={`/track/${track.id}/edit`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Edit Track
                </Link>
              </div>
            </div>
          )}
        </div>
      </TrackProvider>
    </TrackDetailsPlaybackProvider>
  );
}
