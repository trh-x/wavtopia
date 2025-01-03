export interface Track {
  id: string;
  title: string;
  artist: string;
  originalFormat: string;
  originalUrl: string;
  fullTrackUrl: string;
  fullTrackMp3Url: string;
  waveformData: number[];
  coverArt?: string;
  components: Component[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Component {
  id: string;
  name: string;
  wavUrl: string;
  mp3Url: string;
  waveformData: number[];
  type: string;
  trackId: string;
  createdAt: string;
  updatedAt: string;
}
