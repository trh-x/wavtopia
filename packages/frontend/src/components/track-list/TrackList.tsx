import { Link } from "react-router-dom";
import { Track } from "../../types";
import { LoadingState } from "../ui/LoadingState";
import { ErrorState } from "../ui/ErrorState";
import { useAuthToken } from "@/hooks/useAuthToken";
import { TrackListWaveform } from "../waveform/TrackListWaveform";
import { TrackListPlaybackProvider } from "@/contexts/TrackListPlaybackContext";

export function TrackList({ tracks }: { tracks: Track[] }) {
  const { appendTokenToUrl } = useAuthToken();

  if (!tracks?.length)
    return <div className="text-gray-500">No tracks found</div>;

  return (
    <TrackListPlaybackProvider>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tracks.map((track) => (
          <div
            key={track.id}
            className="flex flex-col space-y-2 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <Link to={`/track/${track.id}`} className="block">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center space-x-4">
                  {track.coverArt && (
                    <img
                      src={appendTokenToUrl(`/api/track/${track.id}/cover`)}
                      alt={`${track.title} cover art`}
                      className="h-16 w-16 rounded object-cover"
                    />
                  )}
                  <div>
                    <h3 className="font-medium">{track.title}</h3>
                    <p className="text-sm text-gray-600">{track.artist}</p>
                    <p className="text-xs text-gray-500">
                      by {track.user.username}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
            <TrackListWaveform
              waveformData={track.waveformData}
              audioUrl={appendTokenToUrl(`/api/track/${track.id}/full.mp3`)}
              height={48}
              color="#4b5563"
              progressColor="#6366f1"
            />
          </div>
        ))}
      </div>
    </TrackListPlaybackProvider>
  );
}

export function TrackSection({
  title,
  tracks,
  isLoading,
  error,
}: {
  title: string;
  tracks: Track[] | undefined;
  isLoading: boolean;
  error: unknown;
}) {
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={(error as Error).message} />;

  return (
    <div className="mb-12">
      <h2 className="text-2xl font-bold mb-6">{title}</h2>
      <TrackList tracks={tracks || []} />
    </div>
  );
}
