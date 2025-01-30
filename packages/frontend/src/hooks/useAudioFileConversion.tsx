import { useState, useEffect } from "react";
import { useNotifications } from "../contexts/NotificationsContext";
import { useAuthToken } from "./useAuthToken";

// TODO: DRY this with useFlacConversion

type ConversionType = "full" | "component";
type ConversionStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
type ConversionFormat = "wav" | "flac";

interface UseWavConversionProps {
  trackId: string;
  type: ConversionType;
  componentId?: string;
  format: ConversionFormat;
}

export function useAudioFileConversion({
  trackId,
  type,
  componentId,
  format,
}: UseWavConversionProps) {
  const [status, setStatus] = useState<ConversionStatus>("NOT_STARTED");
  const [isConverting, setIsConverting] = useState(false);
  const { addNotification } = useNotifications();
  const { getToken } = useAuthToken();

  const formatName = format === "wav" ? "WAV" : "FLAC";

  // Poll for status updates when conversion is in progress
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isConverting) {
      const checkStatus = async () => {
        try {
          const token = getToken();
          if (!token) return;

          const statusUrl = componentId
            ? `/api/track/${trackId}/component/${componentId}/audio-conversion-status`
            : `/api/track/${trackId}/audio-conversion-status`;

          const response = await fetch(statusUrl, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
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
                message: `Your ${formatName} file is ready for download.`,
              });
            } else if (data.data.conversionStatus === "FAILED") {
              setIsConverting(false);
              clearInterval(intervalId);
              addNotification({
                type: "error",
                title: `${formatName} Conversion Failed`,
                message: `There was an error converting your file to ${formatName} format.`,
              });
            }
          }
        } catch (error) {
          console.error(
            `Error checking ${formatName} conversion status:`,
            error
          );
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
    };
  }, [trackId, isConverting, addNotification, getToken]);

  const startConversion = async () => {
    try {
      setIsConverting(true);
      const token = getToken();
      if (!token) return;

      const response = await fetch(`/api/track/${trackId}/convert-audio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type,
          componentId,
          format,
        }),
      });

      const data = await response.json();

      if (data.status === "success") {
        addNotification({
          type: "info",
          title: `${formatName} Conversion Started`,
          message: `Your file is being converted to ${formatName} format.`,
        });
      } else if (data.status === "in_progress") {
        addNotification({
          type: "info",
          title: `${formatName} Conversion In Progress`,
          message: `Your file is already being converted to ${formatName} format.`,
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
