import {
  createContext,
  useContext,
  useRef,
  useState,
  ReactNode,
  useCallback,
} from "react";
import WaveSurfer from "wavesurfer.js";

interface PlaybackContextType {
  globalPlaybackTime: number;
  isAnyPlaying: boolean;
  registerWaveform: (wavesurfer: WaveSurfer, isFullTrack: boolean) => void;
  unregisterWaveform: (wavesurfer: WaveSurfer) => void;
  startPlayback: (wavesurfer: WaveSurfer) => void;
  stopPlayback: (wavesurfer: WaveSurfer) => void;
  stopAll: () => void;
  isMuted: (wavesurfer: WaveSurfer) => boolean;
  soloComponent: (wavesurfer: WaveSurfer) => void;
  isSoloed: (wavesurfer: WaveSurfer) => boolean;
}

const PlaybackContext = createContext<PlaybackContextType | null>(null);

interface WaveformInfo {
  wavesurfer: WaveSurfer;
  isFullTrack: boolean;
  isMuted: boolean;
  isSoloed: boolean;
}

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const [isAnyPlaying, setIsAnyPlaying] = useState(false);
  const [globalPlaybackTime, setGlobalPlaybackTime] = useState(0);
  const activeWaveformsRef = useRef<Map<WaveSurfer, WaveformInfo>>(new Map());
  const playingWaveformsRef = useRef<Set<WaveSurfer>>(new Set());
  const playbackIntervalRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  const updateGlobalTime = useCallback(() => {
    // Throttle updates to every 50ms (20 times per second)
    const now = Date.now();
    if (now - lastUpdateTimeRef.current < 50) return;
    lastUpdateTimeRef.current = now;

    if (playingWaveformsRef.current.size > 0) {
      const firstPlayingWaveform = Array.from(playingWaveformsRef.current)[0];
      const currentTime = firstPlayingWaveform.getCurrentTime();

      // Use a 20ms sync threshold
      if (Math.abs(currentTime - globalPlaybackTime) > 0.02) {
        setGlobalPlaybackTime(currentTime);

        // Sync other waveforms if they're more than 20ms out of sync
        playingWaveformsRef.current.forEach((wavesurfer) => {
          if (
            wavesurfer !== firstPlayingWaveform &&
            Math.abs(wavesurfer.getCurrentTime() - currentTime) > 0.02
          ) {
            wavesurfer.seekTo(currentTime / wavesurfer.getDuration());
          }
        });
      }
    }
  }, [globalPlaybackTime]);

  const registerWaveform = (wavesurfer: WaveSurfer, isFullTrack: boolean) => {
    console.log(
      "Registering waveform",
      isFullTrack ? "full track" : "component"
    );
    activeWaveformsRef.current.set(wavesurfer, {
      wavesurfer,
      isFullTrack,
      isMuted: false,
      isSoloed: false,
    });

    wavesurfer.on("seek", () => {
      const currentTime = wavesurfer.getCurrentTime();
      setGlobalPlaybackTime(currentTime);

      // Always sync on user-initiated seeks
      activeWaveformsRef.current.forEach((info, otherWavesurfer) => {
        if (otherWavesurfer !== wavesurfer) {
          otherWavesurfer.seekTo(currentTime / otherWavesurfer.getDuration());
        }
      });
    });

    let lastProcessTime = 0;
    wavesurfer.on("audioprocess", (currentTime: number) => {
      const now = Date.now();
      if (now - lastProcessTime < 50) return;
      lastProcessTime = now;

      setGlobalPlaybackTime(currentTime);

      if (playingWaveformsRef.current.has(wavesurfer)) {
        activeWaveformsRef.current.forEach((info, otherWavesurfer) => {
          if (
            otherWavesurfer !== wavesurfer &&
            Math.abs(otherWavesurfer.getCurrentTime() - currentTime) > 0.02
          ) {
            otherWavesurfer.seekTo(currentTime / otherWavesurfer.getDuration());
          }
        });
      }
    });
  };

  const unregisterWaveform = (wavesurfer: WaveSurfer) => {
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

  const muteAllComponents = () => {
    activeWaveformsRef.current.forEach((info) => {
      if (!info.isFullTrack) {
        info.isMuted = true;
        info.wavesurfer.setVolume(0);
      }
    });
  };

  const unmuteAllComponents = () => {
    activeWaveformsRef.current.forEach((info) => {
      if (!info.isFullTrack) {
        info.isMuted = false;
        info.wavesurfer.setVolume(1);
      }
    });
  };

  const muteFullTrack = () => {
    activeWaveformsRef.current.forEach((info) => {
      if (info.isFullTrack) {
        info.isMuted = true;
        info.wavesurfer.setVolume(0);
      }
    });
  };

  const unmuteFullTrack = () => {
    activeWaveformsRef.current.forEach((info) => {
      if (info.isFullTrack) {
        info.isMuted = false;
        info.wavesurfer.setVolume(1);
      }
    });
  };

  const clearAllSolos = () => {
    activeWaveformsRef.current.forEach((info) => {
      info.isSoloed = false;
    });
  };

  const startPlayback = (wavesurfer: WaveSurfer) => {
    console.log("Starting playback");
    const waveformInfo = activeWaveformsRef.current.get(wavesurfer);
    if (!waveformInfo) return;

    // Clear any solo states
    clearAllSolos();

    if (waveformInfo.isFullTrack) {
      // If starting full track, mute all component tracks
      muteAllComponents();
      unmuteFullTrack();
    } else {
      // If starting component track, mute full track and unmute all components
      muteFullTrack();
      unmuteAllComponents();
    }

    // Add the new waveform to playing set and start playback if not already playing
    if (!playingWaveformsRef.current.has(wavesurfer)) {
      playingWaveformsRef.current.add(wavesurfer);
      wavesurfer.play();
    }
    setIsAnyPlaying(true);

    // Start interval to keep playing waveforms in sync if not already running
    if (!playbackIntervalRef.current) {
      playbackIntervalRef.current = window.setInterval(updateGlobalTime, 100);
    }
  };

  const stopPlayback = (wavesurfer: WaveSurfer) => {
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

  const stopAll = () => {
    console.log("Stopping all playback");
    // Stop all playing waveforms
    playingWaveformsRef.current.forEach((wavesurfer) => {
      wavesurfer.pause();
    });
    playingWaveformsRef.current.clear();
    setIsAnyPlaying(false);

    if (playbackIntervalRef.current) {
      window.clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
  };

  const isMuted = (wavesurfer: WaveSurfer) => {
    const info = activeWaveformsRef.current.get(wavesurfer);
    return info ? info.isMuted : false;
  };

  const soloComponent = (wavesurfer: WaveSurfer) => {
    console.log("Soloing component");
    const waveformInfo = activeWaveformsRef.current.get(wavesurfer);
    if (!waveformInfo || waveformInfo.isFullTrack) return;

    if (waveformInfo.isSoloed) {
      // If already soloed, unsolo by unmuting only other components
      activeWaveformsRef.current.forEach((info) => {
        if (!info.isFullTrack) {
          info.isMuted = false;
          info.isSoloed = false;
          info.wavesurfer.setVolume(1);
        }
        // Keep full track muted
        if (info.isFullTrack) {
          info.isMuted = true;
          info.wavesurfer.setVolume(0);
        }
      });
    } else {
      // Solo this component by muting everything else
      activeWaveformsRef.current.forEach((info, otherWavesurfer) => {
        if (otherWavesurfer !== wavesurfer) {
          info.isMuted = true;
          info.isSoloed = false;
          info.wavesurfer.setVolume(0);
        } else {
          info.isMuted = false;
          info.isSoloed = true;
          info.wavesurfer.setVolume(1);
        }
      });
    }

    // Start playing this component if it's not already playing
    if (!playingWaveformsRef.current.has(wavesurfer)) {
      playingWaveformsRef.current.add(wavesurfer);
      wavesurfer.play();
    }
    setIsAnyPlaying(true);

    // Start interval to keep playing waveforms in sync if not already running
    if (!playbackIntervalRef.current) {
      playbackIntervalRef.current = window.setInterval(updateGlobalTime, 100);
    }
  };

  const isSoloed = (wavesurfer: WaveSurfer) => {
    const info = activeWaveformsRef.current.get(wavesurfer);
    return info ? info.isSoloed : false;
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
        stopAll,
        isMuted,
        soloComponent,
        isSoloed,
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
