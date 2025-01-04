import { styles } from "../../styles/common";

interface TrackHeaderProps {
  title: string;
  artist: string;
  coverArt?: string | null;
}

export function TrackHeader({ title, artist, coverArt }: TrackHeaderProps) {
  return (
    <div className="flex items-center space-x-4 p-4">
      {coverArt && (
        <img
          src={coverArt}
          alt={`${title} cover art`}
          className="h-24 w-24 rounded-lg object-cover"
        />
      )}
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-gray-600 dark:text-gray-400">{artist}</p>
      </div>
    </div>
  );
}
