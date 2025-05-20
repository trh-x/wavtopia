/**
 * Format seconds into a human-readable duration
 * @param seconds Total seconds to format
 * @returns Formatted string (e.g., "2h 30m" or "45m 20s")
 */
export function formatSeconds(seconds: number): string {
  if (!seconds || seconds <= 0) return "0s";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  // Format based on the largest unit present
  if (hours > 0) {
    return `${hours}h ${minutes > 0 ? `${minutes}m` : ""}`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds > 0 ? `${remainingSeconds}s` : ""}`;
  } else {
    return `${remainingSeconds}s`;
  }
}
