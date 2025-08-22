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
    if (isProcessing && !pollingRegistry.has(stem.id)) {
      console.log(`🚀 Starting independent polling for stem: ${stem.id}`);
      initialStemRef.current = stem;

      const checkProcessingStatus = async () => {
        try {
          const registry = pollingRegistry.get(stem.id);
          if (!registry || !registry.isActive) {
            console.log(`🚫 Polling cancelled for stem: ${stem.id}`);
            return;
          }

          console.log(`🔍 Independent check for stem: ${stem.id}`);

          // Get auth token from localStorage directly to avoid dependencies
          const token = localStorage.getItem("wavtopia:auth:token");
          if (!token) {
            console.log("❌ No token available for polling");
            return;
          }
          console.log("✅ Token found for independent polling");

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
              console.log(`📊 Independent stem data:`, {
                stemId: updatedStem.id,
                mp3Url: updatedStem.mp3Url,
                waveformLength: updatedStem.waveformData?.length || 0,
              });

              const hasWaveformData =
                updatedStem.waveformData && updatedStem.waveformData.length > 0;
              const hasDuration =
                updatedStem.duration && updatedStem.duration > 0;
              const isProcessedMp3Url =
                updatedStem.mp3Url &&
                (updatedStem.mp3Url.startsWith("stems/") ||
                  updatedStem.mp3Url.startsWith("http"));
              const hasNewWaveformData =
                JSON.stringify(updatedStem.waveformData) !==
                JSON.stringify(initialStemRef.current.waveformData);

              console.log(`🔍 Independent completion check:`, {
                isProcessedMp3Url,
                hasWaveformData,
                hasDuration,
                hasNewWaveformData,
              });

              if (
                isProcessedMp3Url &&
                hasWaveformData &&
                hasDuration &&
                hasNewWaveformData
              ) {
                console.log(
                  `🎉 INDEPENDENT COMPLETION DETECTED for stem: ${stem.id}`
                );

                // Stop polling
                const registry = pollingRegistry.get(stem.id);
                if (registry) {
                  registry.isActive = false;
                  clearInterval(registry.intervalId);
                  pollingRegistry.delete(stem.id);
                  console.log(
                    `🛑 Independent polling stopped for stem: ${stem.id}`
                  );
                }

                // Trigger completion
                console.log(`🎊 Calling independent completion callback`);
                onProcessingComplete?.();

                // Force page reload as a fallback to ensure UI updates
                console.log(`🔄 Forcing page reload to update UI`);
                window.location.reload();
              } else {
                console.log(
                  `⏳ Independent polling continues for stem: ${stem.id}`
                );
              }
            }
          }
        } catch (error) {
          console.error("❌ Independent polling error:", error);
        }
      };

      // Create independent polling
      const intervalId = setInterval(checkProcessingStatus, 3000);
      pollingRegistry.set(stem.id, { intervalId, isActive: true });
      console.log(`⏰ Independent interval created: ${intervalId}`);

      // Run first check immediately
      checkProcessingStatus();
    }

    return () => {
      // Cleanup only when component unmounts
      const registry = pollingRegistry.get(stem.id);
      if (registry) {
        console.log(`🧹 Independent cleanup for stem: ${stem.id}`);
        registry.isActive = false;
        clearInterval(registry.intervalId);
        pollingRegistry.delete(stem.id);
      }
    };
  }, [isProcessing]); // Only depend on isProcessing

  useEffect(() => {
    // Stop polling when isProcessing becomes false
    if (!isProcessing) {
      const registry = pollingRegistry.get(stem.id);
      if (registry) {
        console.log(
          `🛑 Stopping independent polling due to isProcessing=false`
        );
        registry.isActive = false;
        clearInterval(registry.intervalId);
        pollingRegistry.delete(stem.id);
      }
    }
  }, [isProcessing, stem.id]);

  return {
    isPolling: pollingRegistry.has(stem.id),
  };
}
