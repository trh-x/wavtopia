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
}

const PlaybackContext = createContext<PlaybackContextType | null>(null);

interface WaveformInfo {
  wavesurfer: WaveSurfer;
  isFullTrack: boolean;
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
    activeWaveformsRef.current.set(wavesurfer, { wavesurfer, isFullTrack });

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

  const startPlayback = (wavesurfer: WaveSurfer) => {
    console.log("Starting playback");
    const waveformInfo = activeWaveformsRef.current.get(wavesurfer);
    if (!waveformInfo) return;

    if (waveformInfo.isFullTrack) {
      // If starting full track, stop all other waveforms
      playingWaveformsRef.current.forEach((playingWavesurfer) => {
        if (playingWavesurfer !== wavesurfer) {
          playingWavesurfer.pause();
        }
      });
      playingWaveformsRef.current.clear();
    } else {
      // If starting component track, only stop the full track if it's playing
      activeWaveformsRef.current.forEach((info, otherWavesurfer) => {
        if (
          info.isFullTrack &&
          playingWaveformsRef.current.has(otherWavesurfer)
        ) {
          otherWavesurfer.pause();
          playingWaveformsRef.current.delete(otherWavesurfer);
        }
      });
    }

    // Add the new waveform to playing set and start playback
    playingWaveformsRef.current.add(wavesurfer);
    setIsAnyPlaying(true);
    wavesurfer.play();

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
