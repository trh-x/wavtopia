import { useEffect, useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthToken } from "./useAuthToken";
import { Track, Stem } from "@/types";

interface UseStemProcessingProps {
  track: Track;
  stem: Stem;
  isProcessing: boolean;
  onProcessingComplete?: () => void;
}

export function useStemProcessing({
  track,
  stem,
  isProcessing,
  onProcessingComplete,
}: UseStemProcessingProps) {
  const [isPolling, setIsPolling] = useState(false);
  const { getToken } = useAuthToken();
  const queryClient = useQueryClient();

  // Store the initial stem data to compare against
  const initialStemRef = useRef<Stem>(stem);

  // Store polling state in refs to avoid stale closures
  const isPollingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(true);

  // Stable callback to prevent useEffect re-runs
  const stableOnProcessingComplete = useCallback(() => {
    console.log(`📞 Stable callback triggered for stem: ${stem.id}`);
    onProcessingComplete?.();
  }, [onProcessingComplete, stem.id]);

  useEffect(() => {
    console.log(
      `🔄 useStemProcessing effect triggered: isProcessing=${isProcessing}, isPolling=${isPolling}, stemId=${stem.id}`
    );

    if (isProcessing && !isPollingRef.current) {
      console.log(`🚀 Starting polling for stem: ${stem.id}`);
      // Update the initial stem data when we start processing
      initialStemRef.current = stem;
      isPollingRef.current = true;
      isActiveRef.current = true;
      setIsPolling(true);

      const checkProcessingStatus = async () => {
        try {
          // Check if this effect is still active
          if (!isActiveRef.current) {
            console.log(`🚫 Polling cancelled for stem: ${stem.id}`);
            return;
          }

          const token = getToken();
          if (!token) {
            console.log("No token available for polling");
            return;
          }

          console.log(`Checking processing status for stem: ${stem.id}`);

          // Get the current stem data to check if processing is complete
          // Add cache-busting to ensure we get fresh data
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
            console.log(`Fresh track data fetched for polling:`, {
              trackId: track.id,
              stemsCount: trackData.stems?.length || 0,
            });

            const updatedStem = trackData.stems?.find(
              (s: Stem) => s.id === stem.id
            );

            if (updatedStem) {
              console.log(`Found updated stem data from API:`, {
                stemId: updatedStem.id,
                mp3Url: updatedStem.mp3Url,
                waveformLength: updatedStem.waveformData?.length || 0,
                duration: updatedStem.duration,
              });
              // Check if the stem has been processed (has waveform data and duration)
              const hasWaveformData =
                updatedStem.waveformData && updatedStem.waveformData.length > 0;
              const hasDuration =
                updatedStem.duration && updatedStem.duration > 0;
              const hasNewMp3Url =
                updatedStem.mp3Url !== initialStemRef.current.mp3Url;

              // Check if MP3 URL is the final processed URL (not a temp file)
              const isProcessedMp3Url =
                updatedStem.mp3Url &&
                (updatedStem.mp3Url.startsWith("stems/") ||
                  updatedStem.mp3Url.startsWith("http"));

              // Check if waveform data has actually changed from initial
              const hasNewWaveformData =
                JSON.stringify(updatedStem.waveformData) !==
                JSON.stringify(initialStemRef.current.waveformData);

              console.log(`Stem processing check:`, {
                stemId: stem.id,
                hasWaveformData,
                hasDuration,
                hasNewMp3Url,
                isProcessedMp3Url,
                hasNewWaveformData,
                oldMp3Url: initialStemRef.current.mp3Url,
                newMp3Url: updatedStem.mp3Url,
                oldWaveformLength:
                  initialStemRef.current.waveformData?.length || 0,
                newWaveformLength: updatedStem.waveformData?.length || 0,
                oldDuration: initialStemRef.current.duration,
                newDuration: updatedStem.duration,
              });

              // Processing is complete when we have processed MP3 URL AND new waveform data
              if (
                isProcessedMp3Url &&
                hasWaveformData &&
                hasDuration &&
                hasNewWaveformData
              ) {
                console.log(
                  `🎉 STEM PROCESSING COMPLETED for stem: ${stem.id}`
                );
                console.log(`🛑 Stopping polling and clearing interval`);
                isActiveRef.current = false; // Stop polling
                isPollingRef.current = false;
                setIsPolling(false);
                if (intervalRef.current) {
                  clearInterval(intervalRef.current);
                  intervalRef.current = null;
                }

                // Invalidate the track query to refresh the UI
                console.log(
                  `🔄 Invalidating React Query cache for track: ${track.id}`
                );
                await queryClient.invalidateQueries({
                  queryKey: ["track", track.id],
                });
                console.log(`✅ React Query invalidation completed`);

                // Force a refetch to ensure fresh data
                console.log(`🔄 Force refetching track data`);
                await queryClient.refetchQueries({
                  queryKey: ["track", track.id],
                });
                console.log(`✅ Force refetch completed`);

                // Call the completion callback if provided
                console.log(`🎊 Calling completion callback`);
                stableOnProcessingComplete();
                console.log(`✅ Completion callback finished`);
              } else {
                console.log(
                  `⏳ Stem processing still in progress for stem: ${stem.id} - will check again in 3s`
                );
                console.log(`❌ Missing conditions:`, {
                  needsProcessedMp3Url: !isProcessedMp3Url,
                  needsWaveformData: !hasWaveformData,
                  needsDuration: !hasDuration,
                  needsNewWaveformData: !hasNewWaveformData,
                });
              }
            } else {
              console.log(`Stem not found in response: ${stem.id}`);
            }
          } else {
            console.error(`Failed to fetch track data: ${response.status}`);
          }
        } catch (error) {
          console.error("Error checking stem processing status:", error);
        }
      };

      // Check immediately and then every 3 seconds
      checkProcessingStatus();
      intervalRef.current = setInterval(checkProcessingStatus, 3000);
      console.log(`⏰ Interval created with ID: ${intervalRef.current}`);
    }

    return () => {
      console.log(
        `🧹 Cleaning up polling for stem: ${stem.id}, intervalRef: ${intervalRef.current}, isActiveRef: ${isActiveRef.current}`
      );
      isActiveRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log(`🛑 Interval cleared for stem: ${stem.id}`);
      }
    };
  }, [isProcessing, isPolling]);

  // Reset polling state when isProcessing changes
  useEffect(() => {
    console.log(
      `🔄 Reset polling effect: isProcessing=${isProcessing}, will setIsPolling(false): ${!isProcessing}`
    );
    if (!isProcessing) {
      console.log(`🛑 Setting isPolling=false because isProcessing=false`);
      isPollingRef.current = false;
      isActiveRef.current = false;
      setIsPolling(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log(`🛑 Interval cleared due to isProcessing=false`);
      }
    }
  }, [isProcessing]);

  return {
    isPolling,
  };
}
