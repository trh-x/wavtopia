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
    console.log(`🔄 useStemProcessingById useEffect triggered:`, {
      stemId,
      trackId,
      isProcessing,
      hasRegistryEntry: pollingRegistry.has(stemId),
      willStartPolling: isProcessing && !pollingRegistry.has(stemId),
    });

    if (isProcessing && !pollingRegistry.has(stemId)) {
      console.log(`🚀 Starting new polling for stem ${stemId}`);
      initialProcessingRef.current = true;

      const checkProcessingStatus = async () => {
        try {
          const registry = pollingRegistry.get(stemId);
          if (!registry || !registry.isActive) {
            console.log(
              `⚠️ Registry inactive for stem ${stemId}, stopping polling check`
            );
            return;
          }

          // Get auth token from localStorage directly to avoid dependencies
          const token = localStorage.getItem("wavtopia:auth:token");
          if (!token) {
            console.log("No token available for polling");
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

              console.log(`🔍 Polling stem ${stemId}:`, {
                hasWaveformData,
                hasDuration,
                currentMp3Url: updatedStem.mp3Url,
                waveformLength: updatedStem.waveformData?.length || 0,
                duration: updatedStem.duration,
              });

              // For newly created stems, complete when we have waveform data and duration
              if (hasWaveformData && hasDuration) {
                console.log(`🎉 PROCESSING COMPLETE for stem ${stemId}`);

                // Stop polling
                const registry = pollingRegistry.get(stemId);
                if (registry) {
                  registry.isActive = false;
                  clearInterval(registry.intervalId);
                  pollingRegistry.delete(stemId);
                }

                // Trigger completion callback
                console.log(
                  `🔔 Calling onProcessingComplete callback for stem ${stemId}`
                );
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
      console.log(`🧹 Cleaning up polling for stem ${stemId}`);
      const registry = pollingRegistry.get(stemId);
      if (registry) {
        registry.isActive = false;
        clearInterval(registry.intervalId);
        pollingRegistry.delete(stemId);
        console.log(`🛑 Polling stopped for stem ${stemId} (cleanup)`);
      }
    };
  }, [isProcessing]); // Only depend on isProcessing

  useEffect(() => {
    // Stop polling when isProcessing becomes false
    if (!isProcessing) {
      console.log(
        `🛑 Stopping polling for stem ${stemId} because isProcessing=false`
      );
      const registry = pollingRegistry.get(stemId);
      if (registry) {
        registry.isActive = false;
        clearInterval(registry.intervalId);
        pollingRegistry.delete(stemId);
        console.log(
          `✅ Polling stopped for stem ${stemId} (isProcessing=false)`
        );
      }
    }
  }, [isProcessing]);

  return {
    isPolling: pollingRegistry.has(stemId),
  };
}
