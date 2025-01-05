import { useQuery } from "@tanstack/react-query";
import { useAuthToken } from "../hooks/useAuthToken";
import { api } from "../api/client";
import { TrackSection } from "../components/track-list/TrackList";

export function MyTracks() {
  const { getToken } = useAuthToken();
  const token = getToken();

  const {
    data: userTracks,
    isLoading: isLoadingUserTracks,
    error: userTracksError,
  } = useQuery({
    queryKey: ["tracks", token],
    queryFn: async () => (token ? api.tracks.list(token) : undefined),
    enabled: !!token,
  });

  const {
    data: sharedTracks,
    isLoading: isLoadingSharedTracks,
    error: sharedTracksError,
  } = useQuery({
    queryKey: ["shared-tracks", token],
    queryFn: async () => (token ? api.tracks.listShared(token) : undefined),
    enabled: !!token,
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <TrackSection
        title="Your Tracks"
        tracks={userTracks}
        isLoading={isLoadingUserTracks}
        error={userTracksError}
      />

      <TrackSection
        title="Shared With You"
        tracks={sharedTracks}
        isLoading={isLoadingSharedTracks}
        error={sharedTracksError}
      />
    </div>
  );
}
