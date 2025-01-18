export interface User {
  id: string;
  username: string;
  email: string;
  role: "USER" | "ADMIN";
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  coverArt: string | null;
  originalUrl: string | null;
  waveformData: number[];
  duration?: number;
  isPublic: boolean;
  userId: string;
  user: User;
  components: TrackComponent[];
  sharedWith?: TrackShare[];
}

export interface TrackComponent {
  id: string;
  name: string;
  type: string;
  wavUrl: string;
  mp3Url: string;
  waveformData: number[];
  duration?: number;
  trackId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrackShare {
  userId: string;
  user: User;
}
