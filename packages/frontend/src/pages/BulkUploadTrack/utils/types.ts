export interface FileMatch {
  track: File;
  coverArt?: File;
  title: string;
  path: string;
  uploaded?: boolean;
}

export interface BulkUploadState {
  defaultArtist: string;
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
