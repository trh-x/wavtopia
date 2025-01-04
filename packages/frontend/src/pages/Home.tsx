import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Track } from "@/types";
import { useAuthToken } from "../hooks/useAuthToken";
import { api } from "../api/client";
import { LoadingState } from "../components/ui/LoadingState";
import { ErrorState } from "../components/ui/ErrorState";

function TrackList({ tracks }: { tracks: Track[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tracks.map((track) => (
        <Link
          key={track.id}
          to={`/track/${track.id}`}
          className="block p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-4">
            {track.coverArt && (
              <img
                src={track.coverArt}
                alt={`${track.title} cover art`}
                className="h-16 w-16 rounded object-cover"
              />
            )}
            <div>
              <h3 className="font-medium">{track.title}</h3>
              <p className="text-sm text-gray-600">{track.artist}</p>
              <p className="text-xs text-gray-500">by {track.user.username}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function Home() {
  const { getToken } = useAuthToken();
  const token = getToken();

  const {
    data: tracks,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["tracks", !!token],
    queryFn: () => (token ? api.tracks.list(token) : api.tracks.listPublic()),
  });

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={(error as Error).message} />;
  if (!tracks?.length)
    return <div className="text-center p-4">No tracks found</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">
        {token ? "Your Tracks" : "Public Tracks"}
      </h1>
      <TrackList tracks={tracks} />
    </div>
  );
}
