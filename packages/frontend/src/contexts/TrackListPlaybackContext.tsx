import { createContext, useContext, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

export interface TrackListPlaybackContextType {
  type: "tracklist";
  registerWaveform: (waveform: WaveSurfer) => void;
  unregisterWaveform: (waveform: WaveSurfer) => void;
  startPlayback: (ws: WaveSurfer) => void;
  stopPlayback: (ws: WaveSurfer) => void;
  stopAll: () => void;
  isMuted: () => boolean;
  soloStem: () => void;
  isSoloed: () => boolean;
  triggerUpdate: () => void;
}

const TrackListPlaybackContext =
  createContext<TrackListPlaybackContextType | null>(null);

export function TrackListPlaybackProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const waveformsRef = useRef<Set<WaveSurfer>>(new Set());

  const registerWaveform = (waveform: WaveSurfer) => {
    waveformsRef.current.add(waveform);
  };

  const unregisterWaveform = (waveform: WaveSurfer) => {
    waveformsRef.current.delete(waveform);
  };

  const stopOthers = (currentWaveform: WaveSurfer) => {
    waveformsRef.current.forEach((waveform) => {
      if (waveform !== currentWaveform && waveform.isPlaying()) {
        waveform.pause();
      }
    });
  };

  const startPlayback = (ws: WaveSurfer) => {
    stopOthers(ws);
    ws.play();
  };

  const stopPlayback = (ws: WaveSurfer) => {
    if (ws.isPlaying()) {
      ws.pause();
    } else {
      if (ws.getCurrentTime() === 0) {
        stopAll();
      } else {
        ws.seekTo(0);
      }
    }
  };

  const stopAll = () => {
    waveformsRef.current.forEach((waveform) => {
      if (waveform.isPlaying()) {
        waveform.pause();
      } else {
        waveform.seekTo(0);
      }
    });
  };

  const isMuted = () => false;
  const soloStem = () => {};
  const isSoloed = () => false;

  // Changes to force re-render when stop button is clicked
  const [, setUpdateTrigger] = useState(false);
  const triggerUpdate = () => setUpdateTrigger((prev) => !prev);

  return (
    <TrackListPlaybackContext.Provider
      value={{
        type: "tracklist",
        registerWaveform,
        unregisterWaveform,
        startPlayback,
        stopPlayback,
        stopAll,
        isMuted,
        soloStem,
        isSoloed,
        triggerUpdate,
      }}
    >
      {children}
    </TrackListPlaybackContext.Provider>
  );
}

export function useTrackListPlayback() {
  const context = useContext(TrackListPlaybackContext);
  if (!context) {
    throw new Error(
      "useTrackListPlayback must be used within a TrackListPlaybackProvider"
    );
  }
  return context;
}
