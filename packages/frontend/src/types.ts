export interface User {
  id: string;
  email: string;
  username: string;
}

export interface TrackShare {
  userId: string;
  user: User;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  originalFormat: string;
  originalUrl: string;
  fullTrackUrl: string;
  fullTrackMp3Url: string;
  waveformData: number[];
  coverArt?: string | null;
  metadata?: Record<string, unknown>;
  isPublic: boolean;
  userId: string;
  user: User;
  sharedWith: TrackShare[];
  components: Component[];
  createdAt: string;
  updatedAt: string;
}

export interface Component {
  id: string;
  name: string;
  type: string;
  wavUrl: string;
  mp3Url: string;
  waveformData: number[];
  trackId: string;
  createdAt: string;
  updatedAt: string;
}
