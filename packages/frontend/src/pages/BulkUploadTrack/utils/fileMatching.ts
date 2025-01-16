import { FileMatch } from "./types";

export function fuzzyMatch(str1: string, str2: string): number {
  str1 = str1.toLowerCase();
  str2 = str2.toLowerCase();

  if (str1 === str2) return 1;
  if (str1.includes(str2) || str2.includes(str1)) return 0.9;

  let score = 0;
  const words1 = str1.split(/[\s-_]+/);
  const words2 = str2.split(/[\s-_]+/);

  words1.forEach((word1) => {
    words2.forEach((word2) => {
      if (word1 === word2) score += 1;
      else if (word1.includes(word2) || word2.includes(word1)) score += 0.5;
    });
  });

  return score / Math.max(words1.length, words2.length);
}

export function processFiles(
  files: File[],
  existingMatches: FileMatch[],
  existingArtPaths: Set<string>
): {
  newMatches: FileMatch[];
  unmatchedArt: File[];
} {
  const trackFiles = new Map<string, File>();
  const artFiles: File[] = [];
  const existingPaths = new Set(existingMatches.map((m) => m.path));

  // Sort files into tracks and art
  files.forEach((file) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    const baseName = file.name.substring(0, file.name.lastIndexOf("."));

    if (ext === "xm" && !existingPaths.has(file.name)) {
      trackFiles.set(baseName, file);
    } else if (
      file.type.startsWith("image/") &&
      !existingArtPaths.has(file.name)
    ) {
      artFiles.push(file);
    }
  });

  // Try to match tracks with art using fuzzy matching
  const newMatches: FileMatch[] = [];
  trackFiles.forEach((trackFile, trackBaseName) => {
    let bestMatch: { file: File; score: number } | null = null;

    // Try to match with new art files first
    for (const artFile of artFiles) {
      const artBaseName = artFile.name.substring(
        0,
        artFile.name.lastIndexOf(".")
      );
      const score = fuzzyMatch(trackBaseName, artBaseName);

      if (score > 0.7 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { file: artFile, score };
      }
    }

    newMatches.push({
      track: trackFile,
      coverArt: bestMatch?.file,
      title: trackBaseName,
      path: trackFile.name,
    });

    // Remove matched art file from artFiles
    if (bestMatch) {
      const index = artFiles.indexOf(bestMatch.file);
      if (index > -1) {
        artFiles.splice(index, 1);
      }
    }
  });

  return {
    newMatches,
    unmatchedArt: artFiles,
  };
}
