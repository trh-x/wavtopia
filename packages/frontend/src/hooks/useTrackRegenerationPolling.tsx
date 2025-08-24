import { useEffect, useRef } from "react";
import { Track } from "@/types";

interface UseTrackRegenerationPollingProps {
  trackId: string;
  isRegenerating: boolean;
  onRegenerationComplete?: () => void;
}

// Global polling registry to prevent multiple polling for the same track
const pollingRegistry = new Map<
  string,
  { intervalId: NodeJS.Timeout; isActive: boolean }
>();

export function useTrackRegenerationPolling({
  trackId,
  isRegenerating,
  onRegenerationComplete,
}: UseTrackRegenerationPollingProps) {
  const initialTrackDataRef = useRef<{
    waveformData: number[] | null;
    fullTrackMp3Url: string | null;
    duration: number | null;
  } | null>(null);

  useEffect(() => {
    if (isRegenerating && !pollingRegistry.has(trackId)) {
      const checkRegenerationStatus = async () => {
        try {
          const registry = pollingRegistry.get(trackId);
          if (!registry || !registry.isActive) {
            return;
          }

          // Get auth token from localStorage directly to avoid dependencies
          const token = localStorage.getItem("wavtopia:auth:token");
          if (!token) {
            return;
          }

          const response = await fetch(
            `/api/track/${trackId}?_t=${Date.now()}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Cache-Control": "no-cache",
              },
            }
          );

          if (response.ok) {
            const trackData: Track = await response.json();

            // Initialize reference data on first call
            if (!initialTrackDataRef.current) {
              initialTrackDataRef.current = {
                waveformData: trackData.waveformData,
                fullTrackMp3Url: trackData.fullTrackMp3Url,
                duration: trackData.duration,
              };
              // Don't return immediately - continue to check if regeneration already happened
            }

            const initial = initialTrackDataRef.current;

            // Check if track regeneration is complete by looking for changes
            const hasNewWaveformData =
              trackData.waveformData &&
              JSON.stringify(trackData.waveformData) !==
                JSON.stringify(initial.waveformData);

            const hasNewMp3Url =
              trackData.fullTrackMp3Url &&
              trackData.fullTrackMp3Url !== initial.fullTrackMp3Url;

            const hasDuration = trackData.duration && trackData.duration > 0;

            // Track regeneration is complete when we have new waveform data and/or new mp3 URL
            if ((hasNewWaveformData || hasNewMp3Url) && hasDuration) {
              // Stop polling
              const registry = pollingRegistry.get(trackId);
              if (registry) {
                registry.isActive = false;
                clearInterval(registry.intervalId);
                pollingRegistry.delete(trackId);
              }

              // Trigger completion callback
              onRegenerationComplete?.();
            }
          } else {
            console.error(`Failed to fetch track data: ${response.status}`);
          }
        } catch (error) {
          console.error("Track regeneration polling error:", error);
        }
      };

      // Create independent polling - check more frequently at first
      const intervalId = setInterval(checkRegenerationStatus, 2000); // 2 seconds instead of 3
      pollingRegistry.set(trackId, { intervalId, isActive: true });

      console.log(
        `⏰ [TrackRegenPolling] Set up 2s interval for track ${trackId}, interval ID:`,
        intervalId
      );

      // Run first check immediately to set up the baseline
      console.log(
        `🎯 [TrackRegenPolling] Running initial check for track ${trackId}`
      );
      checkRegenerationStatus();
    }

    return () => {
      // Cleanup only when component unmounts or isRegenerating changes
      console.log(
        `🧹 [TrackRegenPolling] Cleanup triggered for track ${trackId}`
      );
      const registry = pollingRegistry.get(trackId);
      if (registry) {
        registry.isActive = false;
        clearInterval(registry.intervalId);
        pollingRegistry.delete(trackId);
        console.log(
          `🗑️ [TrackRegenPolling] Cleaned up polling for track ${trackId} in effect cleanup`
        );
      }
    };
  }, [isRegenerating]); // Only depend on isRegenerating

  useEffect(() => {
    console.log(
      `🔄 [TrackRegenPolling] isRegenerating change for track ${trackId}:`,
      isRegenerating
    );

    // Stop polling when isRegenerating becomes false
    if (!isRegenerating) {
      console.log(
        `🛑 [TrackRegenPolling] Stopping polling for track ${trackId} (isRegenerating = false)`
      );
      const registry = pollingRegistry.get(trackId);
      if (registry) {
        registry.isActive = false;
        clearInterval(registry.intervalId);
        pollingRegistry.delete(trackId);
        console.log(
          `🗑️ [TrackRegenPolling] Cleaned up polling for track ${trackId} due to isRegenerating = false`
        );
      }
      // Reset the reference when stopping
      initialTrackDataRef.current = null;
      console.log(
        `🔄 [TrackRegenPolling] Reset initial track data ref for track ${trackId}`
      );
    }
  }, [isRegenerating]);

  const isPolling = pollingRegistry.has(trackId);
  console.log(`📊 [TrackRegenPolling] Hook return for track ${trackId}:`, {
    isPolling,
    isRegenerating,
  });

  return {
    isPolling,
  };
}
