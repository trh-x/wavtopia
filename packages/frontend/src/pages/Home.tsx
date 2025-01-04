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
          className="block p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {track.artist}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                by {track.user.username}
              </p>
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
    data: userTracks,
    isLoading: isLoadingUserTracks,
    error: userTracksError,
  } = useQuery({
    queryKey: ["tracks"],
    queryFn: () => api.tracks.list(token!),
    enabled: !!token,
  });

  const {
    data: publicTracks,
    isLoading: isLoadingPublicTracks,
    error: publicTracksError,
  } = useQuery({
    queryKey: ["tracks", "public"],
    queryFn: () => api.tracks.listPublic(),
  });

  const {
    data: sharedTracks,
    isLoading: isLoadingSharedTracks,
    error: sharedTracksError,
  } = useQuery({
    queryKey: ["tracks", "shared"],
    queryFn: () => api.tracks.listShared(token!),
    enabled: !!token,
  });

  if (isLoadingUserTracks || isLoadingPublicTracks || isLoadingSharedTracks) {
    return <LoadingState message="Loading tracks..." />;
  }

  if (userTracksError || publicTracksError || sharedTracksError) {
    return (
      <ErrorState
        message="Failed to load tracks"
        retry={() => {
          if (token) {
            void api.tracks.list(token);
            void api.tracks.listShared(token);
          }
          void api.tracks.listPublic();
        }}
      />
    );
  }

  return (
    <div className="space-y-8 p-4">
      {token && userTracks && userTracks.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-4">Your Tracks</h2>
          <TrackList tracks={userTracks} />
        </section>
      )}

      {token && sharedTracks && sharedTracks.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-4">Shared With You</h2>
          <TrackList tracks={sharedTracks} />
        </section>
      )}

      {publicTracks && publicTracks.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-4">Public Tracks</h2>
          <TrackList tracks={publicTracks} />
        </section>
      )}

      {(!token || !userTracks?.length) &&
        !sharedTracks?.length &&
        !publicTracks?.length && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              {token ? (
                <>
                  No tracks available. Click the "Upload" button to share your
                  first track!
                </>
              ) : (
                <>
                  No tracks available.{" "}
                  <Link to="/login" className="text-primary hover:underline">
                    Log in
                  </Link>{" "}
                  to start sharing your music!
                </>
              )}
            </p>
          </div>
        )}
    </div>
  );
}
