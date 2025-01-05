import { useQuery } from "@tanstack/react-query";
import { useAuthToken } from "@/hooks/useAuthToken";
import { api } from "@/api/client";
import { TrackList } from "@/components/track-list/TrackList";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";

function PublicTracks() {
  const {
    data: publicTracks,
    isLoading: isLoadingPublicTracks,
    error: publicTracksError,
  } = useQuery({
    queryKey: ["public-tracks"],
    queryFn: () => api.tracks.listPublic(),
  });

  if (isLoadingPublicTracks) return <LoadingState />;
  if (publicTracksError)
    return <ErrorState message={(publicTracksError as Error).message} />;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Public Tracks</h1>
      <TrackList tracks={publicTracks || []} />
    </div>
  );
}

function AvailableTracks({ token }: { token: string }) {
  const {
    data: availableTracks,
    isLoading: isLoadingAvailableTracks,
    error: availableTracksError,
  } = useQuery({
    queryKey: ["available-tracks", token],
    queryFn: () => api.tracks.listAvailable(token),
    // enabled: !!token,
  });

  if (isLoadingAvailableTracks) return <LoadingState />;
  if (availableTracksError)
    return <ErrorState message={(availableTracksError as Error).message} />;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Available Tracks</h1>
      <TrackList tracks={availableTracks || []} />
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
