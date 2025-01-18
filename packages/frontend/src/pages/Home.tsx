import { useAuthToken } from "@/hooks/useAuthToken";
import { api } from "@/api/client";
import { TrackSection } from "@/components/track-list/TrackList";
import { ErrorState } from "@/components/ui/ErrorState";
import { useInfiniteTracks } from "@/hooks/useInfiniteTracks";

function PublicTracks() {
  const {
    tracks: publicTracks,
    isLoading: isLoadingPublicTracks,
    error: publicTracksError,
    fetchNextPage: fetchNextPublicTracks,
    isLoadingMore: isLoadingMorePublicTracks,
  } = useInfiniteTracks({
    queryKey: ["public-tracks"],
    fetchFn: (cursor) => api.tracks.listPublic({ cursor }),
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Public Tracks</h1>
      <TrackSection
        title=""
        tracks={publicTracks}
        isLoading={isLoadingPublicTracks}
        error={publicTracksError}
        onLoadMore={fetchNextPublicTracks}
        isLoadingMore={isLoadingMorePublicTracks}
      />
    </div>
  );
}

function AvailableTracks({ token }: { token: string }) {
  const {
    tracks: availableTracks,
    isLoading: isLoadingAvailableTracks,
    error: availableTracksError,
    fetchNextPage: fetchNextAvailableTracks,
    isLoadingMore: isLoadingMoreAvailableTracks,
  } = useInfiniteTracks({
    queryKey: ["available-tracks", token],
    fetchFn: (cursor) => api.tracks.listAvailable(token, { cursor }),
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Available Tracks</h1>
      <TrackSection
        title=""
        tracks={availableTracks}
        isLoading={isLoadingAvailableTracks}
        error={availableTracksError}
        onLoadMore={fetchNextAvailableTracks}
        isLoadingMore={isLoadingMoreAvailableTracks}
      />
    </div>
  );
}

export function Home() {
  const { getToken } = useAuthToken();
  const token = getToken();

  if (!token) {
    return <PublicTracks />;
  }

  return <AvailableTracks token={token} />;
}
