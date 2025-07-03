// TODO: Reconcile with packages/frontend/src/utils/formatDuration.ts

/**
 * Formats seconds into human readable string (e.g., "1.5 hours", "750 minutes", "2.1 seconds")
 */
export function formatSeconds(seconds: number): string {
  const units = ["s", "m", "h", "d", "w", "mo", "y"];
  let value = seconds;
  let unitIndex = 0;

  while (value >= 60 && unitIndex < units.length - 1) {
    value /= 60;
    unitIndex++;
  }

  // Round to at most 1 decimal place
  return `${Math.round(value * 10) / 10} ${units[unitIndex]}`;
}
