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

async function fetchTrack(id: string): Promise<Track> {
  const { getAuthHeader } = useAuthToken();
  const response = await fetch(`/api/tracks/${id}`, {
    headers: {
      Authorization: getAuthHeader(),
    },
  });
  if (!response.ok) {
    throw new Error("Failed to fetch track");
  }
  return response.json();
}

export function TrackDetails() {
  const { id } = useParams<{ id: string }>();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const {
    data: track,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["track", id],
    queryFn: () => fetchTrack(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error || !track) {
    return <div>Error loading track</div>;
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
