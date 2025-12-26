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

      checkRegenerationStatus();
    }

    return () => {
      // Cleanup only when component unmounts or isRegenerating changes
      const registry = pollingRegistry.get(trackId);
      if (registry) {
        registry.isActive = false;
        clearInterval(registry.intervalId);
        pollingRegistry.delete(trackId);
      }
    };
  }, [isRegenerating]); // Only depend on isRegenerating

  useEffect(() => {
    // Stop polling when isRegenerating becomes false
    if (!isRegenerating) {
      const registry = pollingRegistry.get(trackId);
      if (registry) {
        registry.isActive = false;
        clearInterval(registry.intervalId);
        pollingRegistry.delete(trackId);
      }
      // Reset the reference when stopping
      initialTrackDataRef.current = null;
    }
  }, [isRegenerating]);

  const isPolling = pollingRegistry.has(trackId);

  return {
    isPolling,
  };
}
