import { useEffect, useState } from "react";
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

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    console.log(
      `useStemProcessing effect: isProcessing=${isProcessing}, isPolling=${isPolling}`
    );

    if (isProcessing && !isPolling) {
      console.log(`Starting polling for stem: ${stem.id}`);
      setIsPolling(true);

      const checkProcessingStatus = async () => {
        try {
          const token = getToken();
          if (!token) {
            console.log("No token available for polling");
            return;
          }

          console.log(`Checking processing status for stem: ${stem.id}`);

          // Get the current stem data to check if processing is complete
          const response = await fetch(`/api/track/${track.id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const trackData = await response.json();
            const updatedStem = trackData.stems?.find(
              (s: Stem) => s.id === stem.id
            );

            if (updatedStem) {
              // Check if the stem has been processed (has waveform data and duration)
              const hasWaveformData =
                updatedStem.waveformData && updatedStem.waveformData.length > 0;
              const hasDuration =
                updatedStem.duration && updatedStem.duration > 0;
              const hasNewMp3Url = updatedStem.mp3Url !== stem.mp3Url;

              console.log(`Stem processing check:`, {
                stemId: stem.id,
                hasWaveformData,
                hasDuration,
                hasNewMp3Url,
                oldMp3Url: stem.mp3Url,
                newMp3Url: updatedStem.mp3Url,
              });

              // If the stem has been processed (new MP3 URL, waveform data, and duration)
              if (hasNewMp3Url && hasWaveformData && hasDuration) {
                console.log(`Stem processing completed for stem: ${stem.id}`);
                setIsPolling(false);
                clearInterval(intervalId);

                // Invalidate the track query to refresh the UI
                queryClient.invalidateQueries({
                  queryKey: ["track", track.id],
                });

                // Call the completion callback if provided
                onProcessingComplete?.();
              } else {
                console.log(
                  `Stem processing still in progress for stem: ${stem.id}`
                );
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
      intervalId = setInterval(checkProcessingStatus, 3000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [
    isProcessing,
    isPolling,
    track.id,
    stem.id,
    stem.mp3Url,
    getToken,
    queryClient,
    onProcessingComplete,
  ]);

  // Reset polling state when isProcessing changes
  useEffect(() => {
    if (!isProcessing) {
      setIsPolling(false);
    }
  }, [isProcessing]);

  return {
    isPolling,
  };
}
