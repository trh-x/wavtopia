import { createContext, useContext, useRef, useState, ReactNode } from "react";

interface PlaybackContextType {
  globalPlaybackTime: number;
  isAnyPlaying: boolean;
  registerWaveform: (wavesurfer: any) => void;
  unregisterWaveform: (wavesurfer: any) => void;
  startPlayback: (wavesurfer: any) => void;
  stopPlayback: (wavesurfer: any) => void;
}

const PlaybackContext = createContext<PlaybackContextType | null>(null);

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const [isAnyPlaying, setIsAnyPlaying] = useState(false);
  const [globalPlaybackTime, setGlobalPlaybackTime] = useState(0);
  const activeWaveformsRef = useRef<Set<any>>(new Set());
  const playingWaveformsRef = useRef<Set<any>>(new Set());
  const playbackIntervalRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  const updateGlobalTime = () => {
    // Throttle updates to every 100ms (10 times per second)
    const now = Date.now();
    if (now - lastUpdateTimeRef.current < 100) return;
    lastUpdateTimeRef.current = now;

    if (playingWaveformsRef.current.size > 0) {
      const firstPlayingWaveform = Array.from(playingWaveformsRef.current)[0];
      const currentTime = firstPlayingWaveform.getCurrentTime();

      // Still keep a tight sync threshold of 10ms
      if (Math.abs(currentTime - globalPlaybackTime) > 0.01) {
        setGlobalPlaybackTime(currentTime);

        // Sync other playing waveforms if they're more than 10ms out of sync
        playingWaveformsRef.current.forEach((wavesurfer) => {
          if (
            wavesurfer !== firstPlayingWaveform &&
            Math.abs(wavesurfer.getCurrentTime() - currentTime) > 0.01
          ) {
            wavesurfer.seekTo(currentTime / wavesurfer.getDuration());
          }
        });
      }
    }
  };

  const registerWaveform = (wavesurfer: any) => {
    console.log("Registering waveform");
    activeWaveformsRef.current.add(wavesurfer);

    // Add seek event listener to sync position when user clicks on waveform
    wavesurfer.on("seek", () => {
      const newTime = wavesurfer.getCurrentTime();
      if (Math.abs(newTime - globalPlaybackTime) > 0.1) {
        setGlobalPlaybackTime(newTime);

        // Update all playing waveforms to the new position
        playingWaveformsRef.current.forEach((wf) => {
          if (
            wf !== wavesurfer &&
            Math.abs(wf.getCurrentTime() - newTime) > 0.1
          ) {
            wf.seekTo(newTime / wf.getDuration());
          }
        });
      }
    });
  };

  const unregisterWaveform = (wavesurfer: any) => {
    console.log("Unregistering waveform");
    activeWaveformsRef.current.delete(wavesurfer);
    playingWaveformsRef.current.delete(wavesurfer);

    if (playingWaveformsRef.current.size === 0) {
      setIsAnyPlaying(false);
      if (playbackIntervalRef.current) {
        window.clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
    }
  };

  const startPlayback = (wavesurfer: any) => {
    console.log("Starting playback");

    // If other waveforms are playing, sync to their position before adding to playing set
    if (playingWaveformsRef.current.size > 0) {
      const firstPlayingWaveform = Array.from(playingWaveformsRef.current)[0];
      const currentTime = firstPlayingWaveform.getCurrentTime();
      wavesurfer.seekTo(currentTime / wavesurfer.getDuration());

      // Add to playing waveforms after seeking
      playingWaveformsRef.current.add(wavesurfer);
      setIsAnyPlaying(true);

      // Start this waveform with a small delay to ensure sync
      setTimeout(() => wavesurfer.play(), 32);
    } else {
      // If this is the first waveform, start immediately
      playingWaveformsRef.current.add(wavesurfer);
      setIsAnyPlaying(true);
      wavesurfer.play();
    }

    // Start interval to keep playing waveforms in sync if not already running
    if (!playbackIntervalRef.current) {
      playbackIntervalRef.current = window.setInterval(updateGlobalTime, 100);
    }
  };

  const stopPlayback = (wavesurfer: any) => {
    console.log("Stopping playback");
    // Remove from playing waveforms
    playingWaveformsRef.current.delete(wavesurfer);
    wavesurfer.pause();

    // Update playing state and clear interval if no waveforms are playing
    if (playingWaveformsRef.current.size === 0) {
      setIsAnyPlaying(false);
      if (playbackIntervalRef.current) {
        window.clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
    }
  };

  return (
    <PlaybackContext.Provider
      value={{
        globalPlaybackTime,
        isAnyPlaying,
        registerWaveform,
        unregisterWaveform,
        startPlayback,
        stopPlayback,
      }}
    >
      {children}
    </PlaybackContext.Provider>
  );
}

export function usePlayback() {
  const context = useContext(PlaybackContext);
  if (!context) {
    throw new Error("usePlayback must be used within a PlaybackProvider");
  }
  return context;
}
