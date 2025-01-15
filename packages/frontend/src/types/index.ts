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
  waveformData: number[];
}

export interface TrackShare {
  userId: string;
  user: User;
}
