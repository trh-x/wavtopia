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

    if (isProcessing && !pollingRegistry.has(stemId)) {
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

              if (shouldComplete) {
                // Stop polling
                const registry = pollingRegistry.get(stem.id);
                if (registry) {
                  registry.isActive = false;
                  clearInterval(registry.intervalId);
                  pollingRegistry.delete(stem.id);
                }

                // Trigger completion callback first
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
      const registry = pollingRegistry.get(stem.id);
      if (registry) {
        registry.isActive = false;
        clearInterval(registry.intervalId);
        pollingRegistry.delete(stem.id);
      }
    };
  }, [isProcessing]); // Only depend on isProcessing to avoid restarting on stem object changes

  useEffect(() => {
    // Stop polling when isProcessing becomes false
    if (!isProcessing) {
      const registry = pollingRegistry.get(stem.id);
      if (registry) {
        registry.isActive = false;
        clearInterval(registry.intervalId);
        pollingRegistry.delete(stem.id);
      }
    }
  }, [isProcessing]); // Only depend on isProcessing

  return {
    isPolling: pollingRegistry.has(stem.id),
  };
}
