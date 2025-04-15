/**
 * Formats bytes into human readable string (e.g., "1.5 GB", "750 MB", "2.1 KB")
 */
export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  // Round to at most 1 decimal place
  return `${Math.round(value * 10) / 10} ${units[unitIndex]}`;
}
