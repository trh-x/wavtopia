import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Track } from "@/types";
import { useToasts } from "./useToasts";

interface UseTrackAudioProcessingPollingProps {
  trackId: string;
  isProcessing: boolean;
  onProcessingComplete?: () => void;
}

// Global polling registry to prevent multiple polling for the same track
const audioPollingRegistry = new Map<
  string,
  { intervalId: NodeJS.Timeout; isActive: boolean }
>();

export function useTrackAudioProcessingPolling({
  trackId,
  isProcessing,
  onProcessingComplete,
}: UseTrackAudioProcessingPollingProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToasts();
  const initialTrackDataRef = useRef<{
    waveformData: number[] | null;
    fullTrackMp3Url: string | null;
    fullTrackWavUrl: string | null;
    fullTrackFlacUrl: string | null;
    duration: number | null;
    wavConversionStatus: string | null;
    flacConversionStatus: string | null;
  } | null>(null);

  useEffect(() => {
    if (isProcessing && !audioPollingRegistry.has(trackId)) {
      const checkProcessingStatus = async () => {
        try {
          const registry = audioPollingRegistry.get(trackId);
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

            console.log("Audio processing polling - track data:", {
              id: trackData.id,
              waveformDataLength: trackData.waveformData?.length,
              fullTrackMp3Url: trackData.fullTrackMp3Url,
              fullTrackWavUrl: trackData.fullTrackWavUrl,
              fullTrackFlacUrl: trackData.fullTrackFlacUrl,
              duration: trackData.duration,
              wavConversionStatus: (trackData as any).wavConversionStatus,
              flacConversionStatus: (trackData as any).flacConversionStatus,
            });

            // Initialize reference data on first call
            if (!initialTrackDataRef.current) {
              initialTrackDataRef.current = {
                waveformData: trackData.waveformData,
                fullTrackMp3Url: trackData.fullTrackMp3Url,
                fullTrackWavUrl: trackData.fullTrackWavUrl,
                fullTrackFlacUrl: trackData.fullTrackFlacUrl,
                duration: trackData.duration,
                wavConversionStatus: (trackData as any).wavConversionStatus,
                flacConversionStatus: (trackData as any).flacConversionStatus,
              };
              console.log(
                "Initialized reference data:",
                initialTrackDataRef.current
              );
              // Don't return immediately - continue to check if processing already happened
            }

            const initial = initialTrackDataRef.current;

            // Check if audio processing is complete by looking for changes
            const hasNewWaveformData =
              trackData.waveformData &&
              JSON.stringify(trackData.waveformData) !==
                JSON.stringify(initial.waveformData);

            const hasNewMp3Url =
              trackData.fullTrackMp3Url &&
              trackData.fullTrackMp3Url !== initial.fullTrackMp3Url;

            const hasNewWavUrl =
              trackData.fullTrackWavUrl &&
              trackData.fullTrackWavUrl !== initial.fullTrackWavUrl;

            const hasNewFlacUrl =
              trackData.fullTrackFlacUrl &&
              trackData.fullTrackFlacUrl !== initial.fullTrackFlacUrl;

            const hasDuration = trackData.duration && trackData.duration > 0;

            console.log("Status check:", {
              hasNewWaveformData,
              hasNewMp3Url,
              hasNewWavUrl,
              hasNewFlacUrl,
              hasDuration,
            });

            // Audio processing is complete when we have new audio data and duration
            // Focus on the key indicators: waveform data and MP3 URL changes
            const hasNewAudioData = hasNewWaveformData || hasNewMp3Url;

            if (hasNewAudioData && hasDuration) {
              // Stop polling
              const registry = audioPollingRegistry.get(trackId);
              if (registry) {
                registry.isActive = false;
                clearInterval(registry.intervalId);
                audioPollingRegistry.delete(trackId);
              }

              // Show success toast
              addToast({
                type: "success",
                title: "Audio Processing Complete",
                message:
                  "The track audio has been successfully processed and the waveform has been updated.",
              });

              // Invalidate and refetch track data to get the new waveform
              queryClient.invalidateQueries({
                queryKey: ["track", trackId],
                refetchType: "active",
              });

              // Trigger completion callback
              onProcessingComplete?.();
            }
          } else {
            console.error(`Failed to fetch track data: ${response.status}`);
          }
        } catch (error) {
          console.error("Track audio processing polling error:", error);
        }
      };

      // Create independent polling - check every 3 seconds
      const intervalId = setInterval(checkProcessingStatus, 3000);
      audioPollingRegistry.set(trackId, { intervalId, isActive: true });

      // Check immediately
      checkProcessingStatus();
    }

    return () => {
      // Cleanup only when component unmounts or isProcessing changes
      const registry = audioPollingRegistry.get(trackId);
      if (registry) {
        registry.isActive = false;
        clearInterval(registry.intervalId);
        audioPollingRegistry.delete(trackId);
      }
    };
  }, [isProcessing, trackId, queryClient, addToast, onProcessingComplete]);

  useEffect(() => {
    // Stop polling when isProcessing becomes false
    if (!isProcessing) {
      const registry = audioPollingRegistry.get(trackId);
      if (registry) {
        registry.isActive = false;
        clearInterval(registry.intervalId);
        audioPollingRegistry.delete(trackId);
      }
      // Reset the reference when stopping
      initialTrackDataRef.current = null;
    }
  }, [isProcessing, trackId]);

  const isPolling = audioPollingRegistry.has(trackId);

  return {
    isPolling,
  };
}
