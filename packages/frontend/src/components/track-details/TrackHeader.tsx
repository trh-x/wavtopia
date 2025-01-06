import { useAuthToken } from "@/hooks/useAuthToken";

interface TrackHeaderProps {
  title: string;
  artist: string;
  coverArt?: string | null;
  trackId: string;
}

export function TrackHeader({
  title,
  artist,
  coverArt,
  trackId,
}: TrackHeaderProps) {
  const { appendTokenToUrl } = useAuthToken();

  return (
    <div className="flex items-center space-x-4 p-4">
      {coverArt && (
        <img
          src={appendTokenToUrl(`/api/track/${trackId}/cover`)}
          alt={`${title} cover art`}
          className="h-24 w-24 rounded-lg object-cover"
        />
      )}
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-gray-600">{artist}</p>
      </div>
    </div>
  );
}
