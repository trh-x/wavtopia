// TODO: This is duplicated from @wavtopia/core-storage/src/utils/formatBytes.ts
// When the module type compatibility issues are resolved, we should import it from there instead.
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
