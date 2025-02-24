import { useState, useEffect } from "react";
import { useNotifications } from "../contexts/NotificationsContext";
import { useAuthToken } from "./useAuthToken";
import { Track, Stem } from "@/types";

type ConversionType = "full" | "stem";
type ConversionStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
type ConversionFormat = "wav" | "flac";

interface UseAudioFileConversionProps {
  track: Track;
  type: ConversionType;
  stem?: Stem;
  format: ConversionFormat;
}

export function useAudioFileConversion({
  track,
  type,
  stem,
  format,
}: UseAudioFileConversionProps) {
  const [status, setStatus] = useState<ConversionStatus>("NOT_STARTED");
  const [isConverting, setIsConverting] = useState(false);
  const { addNotification } = useNotifications();
  const { getToken } = useAuthToken();

  const formatName = format === "wav" ? "WAV" : "FLAC";
  const name = stem ? stem.name : track.title;

  // Poll for status updates when conversion is in progress
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let currentController = new AbortController();

    if (isConverting) {
      const checkStatus = async () => {
        try {
          const token = getToken();
          if (!token) return;

          const statusUrl = stem
            ? `/api/track/${track.id}/stem/${stem.id}/audio-conversion-status`
            : `/api/track/${track.id}/audio-conversion-status`;

          // Abort any pending requests before making a new one
          currentController.abort();
          // Create a new controller for this request
          currentController = new AbortController();

          const response = await fetch(`${statusUrl}?format=${format}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: currentController.signal,
          });
          const data = await response.json();

          if (data.status === "success") {
            setStatus(data.data.conversionStatus);

            if (data.data.conversionStatus === "COMPLETED") {
              setIsConverting(false);
              clearInterval(intervalId);
              addNotification({
                type: "success",
                title: `${formatName} Conversion Complete`,
                // TODO: Create a shared constant for the file cleanup timeframe
                message: `${name} is ready for download in ${formatName} format. The file will be available for 7 days.`,
              });
            } else if (data.data.conversionStatus === "FAILED") {
              setIsConverting(false);
              clearInterval(intervalId);
              addNotification({
                type: "error",
                title: `${formatName} Conversion Failed`,
                message: `There was an error converting ${name} to ${formatName} format.`,
              });
            }
          }
        } catch (error: unknown) {
          // Only log errors that aren't from aborting
          if (error instanceof Error && error.name !== "AbortError") {
            console.error(
              `Error checking ${formatName} conversion status:`,
              error
            );
          }
        }
      };

      // Check immediately and then every 5 seconds
      // TODO: Maybe start more frequently and incrementally back off?
      checkStatus();
      intervalId = setInterval(checkStatus, 5000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      currentController.abort(); // Clean up any pending requests when unmounting
    };
  }, [
    isConverting,
    track,
    stem,
    format,
    formatName,
    getToken,
    addNotification,
  ]);

  const startConversion = async () => {
    try {
      setIsConverting(true);
      const token = getToken();
      if (!token) return;

      const response = await fetch(`/api/track/${track.id}/convert-audio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type,
          stemId: stem?.id,
          format,
        }),
      });

      const data = await response.json();

      const name = stem ? stem.name : track.title;

      if (data.status === "success") {
        addNotification({
          type: "info",
          title: `${formatName} Conversion Started`,
          message: `${name} is being converted to ${formatName} format.`,
        });
      } else if (data.status === "in_progress") {
        addNotification({
          type: "info",
          title: `${formatName} Conversion In Progress`,
          message: `${name} is already being converted to ${formatName} format.`,
        });
      }
    } catch (error) {
      console.error(`Error starting ${formatName} conversion:`, error);
      setIsConverting(false);
      addNotification({
        type: "error",
        title: `${formatName} Conversion Error`,
        message: `Failed to start ${formatName} conversion.`,
      });
    }
  };

  return {
    status,
    isConverting,
    startConversion,
  };
}
