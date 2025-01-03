import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Track } from "@/types";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useAuthToken } from "@/hooks/useAuthToken";
import { api } from "@/api/client";

function TrackCard({ track }: { track: Track }) {
  return (
    <Link
      to={`/track/${track.id}`}
      className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
    >
      {track.coverArt && (
        <img
          src={track.coverArt}
          alt={track.title}
          className="w-full h-48 object-cover rounded-t-lg"
        />
      )}
      <div className="p-4">
        <h2 className="text-xl font-semibold">{track.title}</h2>
        <p className="text-gray-600">{track.artist}</p>
        <p className="text-sm text-gray-500 mt-2">
          Format: {track.originalFormat}
        </p>
      </div>
    </Link>
  );
}

export function Home() {
  const { getToken } = useAuthToken();

  const {
    data: tracks,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["tracks"],
    queryFn: () => api.tracks.list(getToken()!),
  });

  if (isLoading) {
    return <LoadingState message="Loading tracks..." />;
  }

  if (error) {
    return (
      <ErrorState message="Failed to load tracks" retry={() => refetch()} />
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Available Tracks</h1>
        <Link
          to="/upload"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Upload Track
        </Link>
      </div>

      {tracks?.length === 0 ? (
        <div className="text-center text-gray-600 py-12">
          <p className="mb-4">No tracks available yet.</p>
          <Link
            to="/upload"
            className="text-primary-600 hover:text-primary-700"
          >
            Upload your first track
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tracks?.map((track: Track) => (
            <TrackCard key={track.id} track={track} />
          ))}
        </div>
      )}
    </div>
  );
}
