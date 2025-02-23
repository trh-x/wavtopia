import {
  ButtonIcon,
  StopIcon,
  StopAllIcon,
  ResetIcon,
  SoloIcon,
} from "./icons";
import { TrackListPlaybackContextType } from "@/contexts/TrackListPlaybackContext";
import { SyncedPlaybackContextType } from "@/contexts/SyncedPlaybackContext";

interface ButtonBaseProps {
  isWaveformLoading: boolean;
  isWaveformReady: boolean;
  onClick: () => void;
  className?: string;
  title?: string;
}

interface PlayPauseButtonProps extends ButtonBaseProps {
  isPlaying: boolean;
  isMuted: boolean;
}

interface StopButtonProps extends ButtonBaseProps {
  isPlaying: boolean;
  getCurrentTime: () => number;
  context: TrackListPlaybackContextType | SyncedPlaybackContextType;
}

interface SoloButtonProps extends ButtonBaseProps {
  isPlaying: boolean;
  isMuted: boolean;
  isSoloed: boolean;
}

export function PlayPauseButton({
  isWaveformLoading,
  isWaveformReady,
  isPlaying,
  isMuted,
  onClick,
}: PlayPauseButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isWaveformLoading || !isWaveformReady}
      className={`
        flex-shrink-0
        p-2.5 rounded-full 
        shadow-md hover:shadow-lg 
        transition-all duration-200
        border
        ${
          isWaveformLoading || !isWaveformReady
            ? "cursor-not-allowed opacity-50 border-gray-200"
            : ""
        }
        ${
          isPlaying
            ? isMuted
              ? "opacity-60 bg-gray-100 border-gray-300" // Muted state
              : "bg-blue-50 hover:bg-blue-100 border-blue-200" // Playing state
            : "opacity-70 bg-red-50 hover:bg-red-100 border-red-200" // Stopped state
        }
      `}
    >
      <ButtonIcon
        isWaveformLoading={isWaveformLoading}
        isPlaying={isPlaying}
        isMuted={isMuted}
      />
    </button>
  );
}

function getStopButtonTitle(
  isPlaying: boolean,
  getCurrentTime: () => number,
  context: TrackListPlaybackContextType | SyncedPlaybackContextType
) {
  if (isPlaying) {
    return "Stop Playback";
  }

  if (getCurrentTime() === 0) {
    return context.type === "synced"
      ? "" // Nothing to do in this state
      : "Stop All Tracks";
  }

  return "Reset to Start";
}

function getStopButtonIcon(
  isPlaying: boolean,
  getCurrentTime: () => number,
  context: TrackListPlaybackContextType | SyncedPlaybackContextType
) {
  if (isPlaying) {
    return <StopIcon />;
  }

  if (getCurrentTime() === 0) {
    return context.type === "synced" ? <StopIcon /> : <StopAllIcon />;
  }

  return <ResetIcon />;
}

export function StopButton({
  isWaveformLoading,
  isWaveformReady,
  isPlaying,
  getCurrentTime,
  context,
  onClick,
}: StopButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isWaveformLoading || !isWaveformReady}
      className={`
        flex-shrink-0
        p-2.5 rounded-full 
        shadow-md hover:shadow-lg 
        transition-all duration-200
        border
        ${
          isWaveformLoading || !isWaveformReady
            ? "cursor-not-allowed opacity-50 border-gray-200"
            : "bg-red-50 hover:bg-red-100 border-red-200"
        }
      `}
      title={getStopButtonTitle(isPlaying, getCurrentTime, context)}
    >
      {getStopButtonIcon(isPlaying, getCurrentTime, context)}
    </button>
  );
}

export function SoloButton({
  isWaveformLoading,
  isWaveformReady,
  isPlaying,
  isMuted,
  isSoloed,
  onClick,
}: SoloButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isWaveformLoading || !isWaveformReady}
      className={`
        flex-shrink-0
        p-2.5 rounded-full 
        shadow-md hover:shadow-lg 
        transition-all duration-200
        border
        ${
          isWaveformLoading || !isWaveformReady
            ? "cursor-not-allowed opacity-50 border-gray-200"
            : ""
        }
        ${
          isSoloed
            ? "bg-yellow-100 hover:bg-yellow-200 border-yellow-300 text-yellow-700"
            : isPlaying && !isMuted
            ? "bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-600"
            : "bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-400 hover:text-gray-600"
        }
      `}
      title={isSoloed ? "Unsolo" : "Solo"}
    >
      <SoloIcon />
    </button>
  );
}
