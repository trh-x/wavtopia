import { SyncedPlaybackProvider } from "@/contexts/SyncedPlaybackContext";
import { TrackListPlaybackProvider } from "@/contexts/TrackListPlaybackContext";
import { createContext, useState, ReactNode } from "react";

export type PlayMode = "preview" | "sync";

export interface PlaybackContextType {
  playMode: PlayMode;
  setPlayMode: (playMode: PlayMode) => void;
}

export const PlaybackContext = createContext<PlaybackContextType | null>(null);

export function TrackDetailsPlaybackProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [playMode, setPlayMode] = useState<PlayMode>("preview");

  const PlaybackProvider =
    playMode === "preview" ? TrackListPlaybackProvider : SyncedPlaybackProvider;

  return (
    <PlaybackContext.Provider value={{ playMode, setPlayMode }}>
      <PlaybackProvider>{children}</PlaybackProvider>
    </PlaybackContext.Provider>
  );
}
