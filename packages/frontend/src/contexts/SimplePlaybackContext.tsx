import { createContext, useContext, useRef, useState, ReactNode } from "react";
import WaveSurfer from "wavesurfer.js";

interface SimplePlaybackContextType {
  isAnyPlaying: boolean;
  registerWaveform: (wavesurfer: WaveSurfer) => void;
  unregisterWaveform: (wavesurfer: WaveSurfer) => void;
  startPlayback: (wavesurfer: WaveSurfer) => void;
  stopPlayback: (wavesurfer: WaveSurfer) => void;
  stopAll: () => void;
}

const SimplePlaybackContext = createContext<SimplePlaybackContextType | null>(
  null
);

export function SimplePlaybackProvider({ children }: { children: ReactNode }) {
  const [isAnyPlaying, setIsAnyPlaying] = useState(false);
  const activeWaveformsRef = useRef<Set<WaveSurfer>>(new Set());
  const playingWaveformsRef = useRef<Set<WaveSurfer>>(new Set());

  const registerWaveform = (wavesurfer: WaveSurfer) => {
    console.log("Registering waveform in simple context");
    activeWaveformsRef.current.add(wavesurfer);
  };

  const unregisterWaveform = (wavesurfer: WaveSurfer) => {
    console.log("Unregistering waveform from simple context");
    activeWaveformsRef.current.delete(wavesurfer);
    playingWaveformsRef.current.delete(wavesurfer);

    if (playingWaveformsRef.current.size === 0) {
      setIsAnyPlaying(false);
    }
  };

  const startPlayback = (wavesurfer: WaveSurfer) => {
    console.log("Starting playback in simple context");
    // Stop any other playing waveforms
    playingWaveformsRef.current.forEach((otherWavesurfer) => {
      if (otherWavesurfer !== wavesurfer) {
        otherWavesurfer.pause();
      }
    });
    playingWaveformsRef.current.clear();

    // Start the new waveform
    playingWaveformsRef.current.add(wavesurfer);
    wavesurfer.play();
    setIsAnyPlaying(true);
  };

  const stopPlayback = (wavesurfer: WaveSurfer) => {
    console.log("Stopping playback in simple context");
    playingWaveformsRef.current.delete(wavesurfer);
    wavesurfer.pause();

    if (playingWaveformsRef.current.size === 0) {
      setIsAnyPlaying(false);
    }
  };

  const stopAll = () => {
    console.log("Stopping all playback in simple context");
    playingWaveformsRef.current.forEach((wavesurfer) => {
      wavesurfer.pause();
    });
    playingWaveformsRef.current.clear();
    setIsAnyPlaying(false);
  };

  return (
    <SimplePlaybackContext.Provider
      value={{
        isAnyPlaying,
        registerWaveform,
        unregisterWaveform,
        startPlayback,
        stopPlayback,
        stopAll,
      }}
    >
      {children}
    </SimplePlaybackContext.Provider>
  );
}

export function useSimplePlayback() {
  const context = useContext(SimplePlaybackContext);
  if (!context) {
    throw new Error(
      "useSimplePlayback must be used within a SimplePlaybackProvider"
    );
  }
  return context;
}
