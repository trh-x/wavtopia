import { createContext, useContext, ReactNode } from "react";
import WaveSurfer from "wavesurfer.js";
import { useBasePlayback } from "./useBasePlayback";

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
  const {
    isAnyPlaying,
    setIsAnyPlaying,
    playingWaveformsRef,
    registerWaveform: baseRegisterWaveform,
    unregisterWaveform,
    stopPlayback,
    stopAll,
  } = useBasePlayback(false);

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

  return (
    <SimplePlaybackContext.Provider
      value={{
        isAnyPlaying,
        registerWaveform: (wavesurfer) => baseRegisterWaveform(wavesurfer),
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
