import { useQuery } from "@tanstack/react-query";
import { useAuthToken } from "@/hooks/useAuthToken";
import { api } from "@/api/client";
import { TrackList, TrackSection } from "@/components/track-list/TrackList";
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

function AllTracks({ token }: { token: string }) {
  const {
    data: allTracks,
    isLoading: isLoadingAllTracks,
    error: allTracksError,
  } = useQuery({
    queryKey: ["all-tracks", token],
    queryFn: () => api.tracks.listAll(token),
    // enabled: !!token,
  });

  if (isLoadingAllTracks) return <LoadingState />;
  if (allTracksError)
    return <ErrorState message={(allTracksError as Error).message} />;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">All Tracks</h1>
      <TrackList tracks={allTracks || []} />
    </div>
  );
}

export function Home() {
  const { getToken } = useAuthToken();
  const token = getToken();

  if (!token) {
    return <PublicTracks />;
  }

  return <AllTracks token={token} />;
}
