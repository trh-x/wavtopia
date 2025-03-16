export interface FileMatch {
  track: File;
  coverArt?: File;
  title: string;
  path: string;
  uploaded?: boolean;
}

export interface BulkUploadState {
  defaultArtistName: string;
  defaultLicenseId: string | undefined;
  matches: FileMatch[];
  currentUploadIndex: number;
  uploadedTracks: string[];
  error?: string;
  unmatchedCoverArt: File[];
}

export interface DraggedCoverArt {
  sourceId: string;
  file: File;
}
