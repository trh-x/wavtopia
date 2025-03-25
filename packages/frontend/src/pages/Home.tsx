import { useAuthToken } from "@/hooks/useAuthToken";
import { TrackList } from "@/components/track-list/TrackList";
import { useInfiniteTracks } from "@/hooks/useInfiniteTracks";
import { useTrackSort } from "@/hooks/useTrackSort";

function PublicTracks() {
  const { sortField, sortDirection, handleSort, currentSortValue } =
    useTrackSort();

  const {
    tracks: publicTracks,
    isLoading: isLoadingPublicTracks,
    error: publicTracksError,
    fetchNextPage: fetchNextPublicTracks,
    isFetchingNextPage: isLoadingMorePublicTracks,
  } = useInfiniteTracks("/tracks/public", {
    sortField,
    sortDirection,
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Public Tracks</h1>
      <TrackList
        tracks={publicTracks}
        isLoading={isLoadingPublicTracks}
        error={publicTracksError}
        onLoadMore={fetchNextPublicTracks}
        isLoadingMore={isLoadingMorePublicTracks}
        onSort={handleSort}
        currentSort={currentSortValue}
        showVisibilityIcons={false}
      />
    </div>
  );
}

function AvailableTracks() {
  const { sortField, sortDirection, handleSort, currentSortValue } =
    useTrackSort();

  const {
    tracks: availableTracks,
    isLoading: isLoadingAvailableTracks,
    error: availableTracksError,
    fetchNextPage: fetchNextAvailableTracks,
    isFetchingNextPage: isLoadingMoreAvailableTracks,
  } = useInfiniteTracks("/tracks/available", {
    sortField,
    sortDirection,
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Available Tracks</h1>
      <TrackList
        tracks={availableTracks}
        isLoading={isLoadingAvailableTracks}
        error={availableTracksError}
        onLoadMore={fetchNextAvailableTracks}
        isLoadingMore={isLoadingMoreAvailableTracks}
        onSort={handleSort}
        currentSort={currentSortValue}
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

  return <AvailableTracks />;
}
