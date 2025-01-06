import { useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

interface WaveformInfo {
  wavesurfer: WaveSurfer;
  isFullTrack: boolean;
  isMuted: boolean;
  isSoloed: boolean;
}

export interface BasePlaybackState {
  isAnyPlaying: boolean;
  activeWaveforms: Map<WaveSurfer, WaveformInfo> | Set<WaveSurfer>;
  playingWaveforms: Set<WaveSurfer>;
}

export function useBasePlayback(useSyncFeatures: boolean = false) {
  const [isAnyPlaying, setIsAnyPlaying] = useState(false);
  const activeWaveformsRef = useRef<
    Map<WaveSurfer, WaveformInfo> | Set<WaveSurfer>
  >(useSyncFeatures ? new Map() : new Set());
  const playingWaveformsRef = useRef<Set<WaveSurfer>>(new Set());

  const registerWaveform = (wavesurfer: WaveSurfer, isFullTrack?: boolean) => {
    console.log(
      "Registering waveform",
      useSyncFeatures ? (isFullTrack ? "full track" : "component") : ""
    );

    if (useSyncFeatures && isFullTrack !== undefined) {
      (activeWaveformsRef.current as Map<WaveSurfer, WaveformInfo>).set(
        wavesurfer,
        {
          wavesurfer,
          isFullTrack,
          isMuted: false,
          isSoloed: false,
        }
      );
    } else {
      (activeWaveformsRef.current as Set<WaveSurfer>).add(wavesurfer);
    }
  };

  const unregisterWaveform = (wavesurfer: WaveSurfer) => {
    console.log("Unregistering waveform");
    if (useSyncFeatures) {
      (activeWaveformsRef.current as Map<WaveSurfer, WaveformInfo>).delete(
        wavesurfer
      );
    } else {
      (activeWaveformsRef.current as Set<WaveSurfer>).delete(wavesurfer);
    }
    playingWaveformsRef.current.delete(wavesurfer);

    if (playingWaveformsRef.current.size === 0) {
      setIsAnyPlaying(false);
    }
  };

  const stopPlayback = (wavesurfer: WaveSurfer) => {
    console.log("Stopping playback");
    playingWaveformsRef.current.delete(wavesurfer);
    wavesurfer.pause();

    if (playingWaveformsRef.current.size === 0) {
      setIsAnyPlaying(false);
    }
  };

  const stopAll = () => {
    console.log("Stopping all playback");
    playingWaveformsRef.current.forEach((wavesurfer) => {
      wavesurfer.pause();
    });
    playingWaveformsRef.current.clear();
    setIsAnyPlaying(false);
  };

  return {
    isAnyPlaying,
    setIsAnyPlaying,
    activeWaveformsRef,
    playingWaveformsRef,
    registerWaveform,
    unregisterWaveform,
    stopPlayback,
    stopAll,
  };
}
