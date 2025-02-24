// TODO: These types should come from core-storage.

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
  fullTrackWavUrl: string | null;
  fullTrackMp3Url: string | null;
  fullTrackFlacUrl: string | null;
  waveformData: number[];
  duration?: number;
  isPublic: boolean;
  userId: string;
  user: User;
  stems: Stem[];
  sharedWith?: TrackShare[];
}

export interface Stem {
  id: string;
  name: string;
  type: string;
  wavUrl: string | null;
  mp3Url: string;
  flacUrl: string | null;
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
