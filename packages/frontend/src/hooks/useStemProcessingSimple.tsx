import { useEffect, useRef } from "react";
import { Track, Stem } from "@/types";

interface UseStemProcessingSimpleProps {
  track: Track;
  stem: Stem;
  isProcessing: boolean;
  onProcessingComplete?: () => void;
}

// Global polling registry to prevent multiple polling for the same stem
const pollingRegistry = new Map<
  string,
  { intervalId: NodeJS.Timeout; isActive: boolean }
>();

export function useStemProcessingSimple({
  track,
  stem,
  isProcessing,
  onProcessingComplete,
}: UseStemProcessingSimpleProps) {
  const initialStemRef = useRef<Stem>(stem);

  useEffect(() => {
    const stemId = stem.id;
    console.log(`🔄 useStemProcessingSimple useEffect triggered:`, {
      stemId,
      stemName: stem.name,
      isProcessing,
      hasRegistryEntry: pollingRegistry.has(stemId),
      willStartPolling: isProcessing && !pollingRegistry.has(stemId),
    });

    if (isProcessing && !pollingRegistry.has(stemId)) {
      console.log(`🚀 Starting new polling for stem ${stemId} (${stem.name})`);
      initialStemRef.current = stem;

      const checkProcessingStatus = async () => {
        try {
          const registry = pollingRegistry.get(stem.id);
          if (!registry || !registry.isActive) {
            return;
          }

          // Get auth token from localStorage directly to avoid dependencies
          const token = localStorage.getItem("wavtopia:auth:token");
          if (!token) {
            return;
          }

          const response = await fetch(
            `/api/track/${track.id}?_t=${Date.now()}`,
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
              (s: Stem) => s.id === stem.id
            );

            if (updatedStem) {
              const hasWaveformData =
                updatedStem.waveformData && updatedStem.waveformData.length > 0;
              const hasDuration =
                updatedStem.duration && updatedStem.duration > 0;
              const isProcessedMp3Url =
                updatedStem.mp3Url &&
                (updatedStem.mp3Url.startsWith("stems/") ||
                  updatedStem.mp3Url.startsWith("http"));
              // For newly created stems, initial waveform data might be null/undefined
              // In this case, any waveform data means it's new
              const initialWaveformData = initialStemRef.current.waveformData;
              const hasNewWaveformData =
                !initialWaveformData || initialWaveformData.length === 0
                  ? hasWaveformData // If started with no data, any data is new
                  : JSON.stringify(updatedStem.waveformData) !==
                    JSON.stringify(initialWaveformData);

              // For newly created stems, we should complete when we have waveform data and duration
              // regardless of the MP3 URL status, since the URL might still be processing
              const isNewlyCreatedStem =
                !initialWaveformData || initialWaveformData.length === 0;
              const shouldComplete = isNewlyCreatedStem
                ? hasWaveformData && hasDuration && hasNewWaveformData
                : isProcessedMp3Url &&
                  hasWaveformData &&
                  hasDuration &&
                  hasNewWaveformData;

              console.log(`🔍 Polling stem ${stem.id} (${stem.name}):`, {
                hasWaveformData,
                hasDuration,
                isProcessedMp3Url,
                hasNewWaveformData,
                isNewlyCreatedStem,
                shouldComplete,
                currentMp3Url: updatedStem.mp3Url,
                waveformLength: updatedStem.waveformData?.length || 0,
                duration: updatedStem.duration,
                initialWaveformLength:
                  initialStemRef.current.waveformData?.length || 0,
              });

              if (shouldComplete) {
                console.log(
                  `🎉 PROCESSING COMPLETE for stem ${stem.id} (${stem.name})`
                );

                // Stop polling
                const registry = pollingRegistry.get(stem.id);
                if (registry) {
                  registry.isActive = false;
                  clearInterval(registry.intervalId);
                  pollingRegistry.delete(stem.id);
                }

                // Trigger completion callback first
                console.log(
                  `🔔 Calling onProcessingComplete callback for stem ${stem.id}`
                );
                onProcessingComplete?.();

                // Let React handle the UI update through the callback
              }
            }
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      };

      // Create independent polling
      const intervalId = setInterval(checkProcessingStatus, 3000);
      pollingRegistry.set(stem.id, { intervalId, isActive: true });

      // Run first check immediately
      checkProcessingStatus();
    }

    return () => {
      // Cleanup only when component unmounts
      console.log(
        `🧹 Cleaning up polling for stem ${stem.id} due to useEffect cleanup - dependency change detected`
      );
      console.log(`🧹 Current state when cleaning up:`, {
        stemId: stem.id,
        isProcessing,
        hadRegistry: pollingRegistry.has(stem.id),
      });
      const registry = pollingRegistry.get(stem.id);
      if (registry) {
        registry.isActive = false;
        clearInterval(registry.intervalId);
        pollingRegistry.delete(stem.id);
        console.log(
          `🛑 Polling stopped for stem ${stem.id} (useEffect cleanup)`
        );
      }
    };
  }, [isProcessing]); // Only depend on isProcessing to avoid restarting on stem object changes

  useEffect(() => {
    // Stop polling when isProcessing becomes false
    console.log(`🔄 isProcessing useEffect triggered:`, {
      stemId: stem.id,
      isProcessing,
      willStopPolling: !isProcessing && pollingRegistry.has(stem.id),
    });

    if (!isProcessing) {
      console.log(
        `🛑 Stopping polling for stem ${stem.id} because isProcessing=false`
      );
      const registry = pollingRegistry.get(stem.id);
      if (registry) {
        registry.isActive = false;
        clearInterval(registry.intervalId);
        pollingRegistry.delete(stem.id);
        console.log(
          `✅ Polling stopped for stem ${stem.id} (isProcessing=false)`
        );
      } else {
        console.log(
          `ℹ️ No registry found for stem ${stem.id} when trying to stop`
        );
      }
    }
  }, [isProcessing]); // Only depend on isProcessing

  return {
    isPolling: pollingRegistry.has(stem.id),
  };
}
