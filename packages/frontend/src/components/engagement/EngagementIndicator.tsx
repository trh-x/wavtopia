import { cn } from "../../utils/cn";
import { Track } from "@wavtopia/core-storage";

function getEngagementLevel(plays: number, downloads: number): number {
  const total = plays + downloads;
  if (total === 0) return 0;
  if (total < 10) return 1;
  if (total < 50) return 2;
  return 3;
}

function getEngagementMessage(track: Track): string {
  const level = getEngagementLevel(track.totalPlays, track.totalDownloads);

  switch (level) {
    case 1:
      return "Activity: Getting discovered! 🌱";
    case 2:
      return "Activity: Gaining momentum! ⭐️";
    case 3:
      return "Activity: Track is on fire! 🔥";
    default:
      return "Activity: No plays or downloads yet";
  }
}

interface EngagementIndicatorProps {
  track: Track;
  className?: string;
}

export function EngagementIndicator({
  track,
  className,
}: EngagementIndicatorProps) {
  if (track.totalPlays === 0 && track.totalDownloads === 0) {
    return null;
  }

  const level = getEngagementLevel(track.totalPlays, track.totalDownloads);

  return (
    <div
      className={cn("flex gap-0.5 items-end h-3", className)}
      title={getEngagementMessage(track)}
    >
      <div
        className={cn(
          "w-0.5 transition-all",
          level >= 1 ? "h-1 bg-indigo-300" : "h-1 bg-gray-200"
        )}
      />
      <div
        className={cn(
          "w-0.5 transition-all",
          level >= 2 ? "h-2 bg-indigo-400" : "h-2 bg-gray-200"
        )}
      />
      <div
        className={cn(
          "w-0.5 transition-all",
          level >= 3 ? "h-3 bg-indigo-500" : "h-3 bg-gray-200"
        )}
      />
    </div>
  );
}
