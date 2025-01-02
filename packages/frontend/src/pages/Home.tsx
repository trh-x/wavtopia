import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Track } from "@/types";

async function fetchTracks(): Promise<Track[]> {
  const response = await fetch("/api/tracks");
  if (!response.ok) {
    throw new Error("Failed to fetch tracks");
  }
  return response.json();
}

export function Home() {
  const {
    data: tracks,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["tracks"],
    queryFn: fetchTracks,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading tracks</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Available Tracks</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tracks?.map((track) => (
          <Link
            key={track.id}
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
        ))}
      </div>
    </div>
  );
}
