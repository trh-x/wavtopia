export interface Track {
  id: string;
  title: string;
  artist: string;
  originalFormat: string;
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
  type: string;
  trackId: string;
  createdAt: string;
  updatedAt: string;
}
