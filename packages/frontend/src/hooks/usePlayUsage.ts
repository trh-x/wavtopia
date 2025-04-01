import { useRef, useEffect } from "react";
import { api } from "@/api/client";
import { useAuthToken } from "@/hooks/useAuthToken";
import { storage } from "@/utils/storage";
import { session } from "@/utils/session";

// FIXME: Increase this to a longer duration e.g. 30 seconds.
// Minimum duration in seconds before we record a play event.
const MIN_PLAY_DURATION = 5;

// One hour cooldown between plays
const PLAY_COOLDOWN_MS = 60 * 60 * 1000;

interface PlayUsageOptions {
  trackId: string;
  stemId?: string;
  isStreamable?: boolean;
}

// Create a namespaced storage for play tracking
const playStorage = storage.namespace("play-tracking");

// Helper function to check if we can record a play event
const canRecordPlay = (trackId: string, token: string | null) => {
  const key = token
    ? `${trackId}_${token}`
    : `${trackId}_anon_${session.getAnonId()}`;

  const lastPlay = playStorage.get(key);
  if (!lastPlay) return true;

  const lastPlayTime = parseInt(lastPlay, 10);
  return Date.now() - lastPlayTime >= PLAY_COOLDOWN_MS;
};

// Helper function to record last play time
const recordLastPlayTime = (trackId: string, token: string | null) => {
  const key = token
    ? `${trackId}_${token}`
    : `${trackId}_anon_${session.getAnonId()}`;

  playStorage.set(key, Date.now().toString());
};

export function usePlayUsage({
  trackId,
  stemId,
  isStreamable,
}: PlayUsageOptions) {
  const playStartTimeRef = useRef<number | null>(null);
  const playDurationRef = useRef<number>(0);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasRecordedRef = useRef(false);
  const { token } = useAuthToken();

  // Record play event
  const recordPlayUsage = async (duration: number) => {
    // Check if we can record a play event
    if (!canRecordPlay(trackId, token)) {
      console.log("Play event already recorded within the last hour");
      return;
    }

    try {
      await api.track.recordUsage(
        trackId,
        {
          eventType: "PLAY",
          playbackSource: isStreamable ? "STREAM" : "SYNCED",
          duration,
        },
        token,
        stemId
      );

      // Record the play time after successful tracking
      recordLastPlayTime(trackId, token);
    } catch (error) {
      console.error("Failed to record play usage:", error);
    }
  };

  // Start monitoring play duration
  const startMonitoring = () => {
    if (hasRecordedRef.current) return;

    const now = Date.now();
    playStartTimeRef.current = now;
    playDurationRef.current = 0;

    // Clear any existing timer
    if (playTimerRef.current) {
      clearTimeout(playTimerRef.current);
      playTimerRef.current = null;
    }

    // Set timer to check at exactly MIN_PLAY_DURATION seconds
    playTimerRef.current = setTimeout(() => {
      if (playStartTimeRef.current && !hasRecordedRef.current) {
        const duration = (Date.now() - playStartTimeRef.current) / 1000;
        if (duration >= MIN_PLAY_DURATION) {
          recordPlayUsage(duration);
          hasRecordedRef.current = true;
        }
      }
    }, MIN_PLAY_DURATION * 1000);
  };

  // Stop monitoring play duration
  const stopMonitoring = () => {
    if (playTimerRef.current) {
      clearTimeout(playTimerRef.current);
      playTimerRef.current = null;
    }

    // If we haven't recorded yet, update the duration
    if (playStartTimeRef.current && !hasRecordedRef.current) {
      playDurationRef.current = (Date.now() - playStartTimeRef.current) / 1000;
    }
    playStartTimeRef.current = null;
  };

  // Clean up function to handle final recording and timer cleanup
  const cleanup = () => {
    // If we haven't recorded yet but have played more than minimum duration, record it
    if (
      !hasRecordedRef.current &&
      playDurationRef.current >= MIN_PLAY_DURATION
    ) {
      recordPlayUsage(playDurationRef.current);
    }
    stopMonitoring();
  };

  // Reset monitoring when trackId or stemId changes
  useEffect(() => {
    hasRecordedRef.current = false;
    playDurationRef.current = 0;
    stopMonitoring();
  }, [trackId, stemId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playTimerRef.current) {
        clearTimeout(playTimerRef.current);
      }
    };
  }, []);

  return {
    startMonitoring,
    stopMonitoring,
    cleanup,
  };
}
