import { useEffect, useRef } from "react";
import { Track } from "@/types";

interface UseStemProcessingByIdProps {
  trackId: string;
  stemId: string;
  isProcessing: boolean;
  onProcessingComplete?: () => void;
}

// Global polling registry to prevent multiple polling for the same stem
const pollingRegistry = new Map<
  string,
  { intervalId: NodeJS.Timeout; isActive: boolean }
>();

export function useStemProcessingById({
  trackId,
  stemId,
  isProcessing,
  onProcessingComplete,
}: UseStemProcessingByIdProps) {
  const initialProcessingRef = useRef(false);

  useEffect(() => {
    if (isProcessing && !pollingRegistry.has(stemId)) {
      initialProcessingRef.current = true;

      const checkProcessingStatus = async () => {
        try {
          const registry = pollingRegistry.get(stemId);
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
            const trackData = await response.json();
            const updatedStem = trackData.stems?.find(
              (s: any) => s.id === stemId
            );

            if (updatedStem) {
              const hasWaveformData =
                updatedStem.waveformData && updatedStem.waveformData.length > 0;
              const hasDuration =
                updatedStem.duration && updatedStem.duration > 0;

              // For newly created stems, complete when we have waveform data and duration
              if (hasWaveformData && hasDuration) {
                // Stop polling
                const registry = pollingRegistry.get(stemId);
                if (registry) {
                  registry.isActive = false;
                  clearInterval(registry.intervalId);
                  pollingRegistry.delete(stemId);
                }

                // Trigger completion callback
                onProcessingComplete?.();
              }
            } else {
              console.log(`⚠️ Stem ${stemId} not found in track data`);
            }
          } else {
            console.error(`Failed to fetch track data: ${response.status}`);
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      };

      // Create independent polling
      const intervalId = setInterval(checkProcessingStatus, 3000);
      pollingRegistry.set(stemId, { intervalId, isActive: true });

      // Run first check immediately
      checkProcessingStatus();
    }

    return () => {
      // Cleanup only when component unmounts or isProcessing changes
      const registry = pollingRegistry.get(stemId);
      if (registry) {
        registry.isActive = false;
        clearInterval(registry.intervalId);
        pollingRegistry.delete(stemId);
      }
    };
  }, [isProcessing]); // Only depend on isProcessing

  useEffect(() => {
    // Stop polling when isProcessing becomes false
    if (!isProcessing) {
      const registry = pollingRegistry.get(stemId);
      if (registry) {
        registry.isActive = false;
        clearInterval(registry.intervalId);
        pollingRegistry.delete(stemId);
      }
    }
  }, [isProcessing]);

  return {
    isPolling: pollingRegistry.has(stemId),
  };
}
