import { useState, useEffect } from "react";
import { useNotifications } from "../contexts/NotificationsContext";
import { useAuthToken } from "../hooks/useAuthToken";

type ConversionType = "full" | "component";
type ConversionStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";

interface UseWavConversionProps {
  trackId: string;
  type: ConversionType;
  componentId?: string;
}

export function useWavConversion({
  trackId,
  type,
  componentId,
}: UseWavConversionProps) {
  const [status, setStatus] = useState<ConversionStatus>("NOT_STARTED");
  const [isConverting, setIsConverting] = useState(false);
  const { addNotification } = useNotifications();
  const { getToken } = useAuthToken();

  // Poll for status updates when conversion is in progress
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isConverting) {
      const checkStatus = async () => {
        try {
          const token = getToken();
          if (!token) return;

          const response = await fetch(`/api/track/${trackId}/wav-status`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const data = await response.json();

          if (data.status === "success") {
            setStatus(data.data.conversionStatus);

            if (data.data.conversionStatus === "COMPLETED") {
              setIsConverting(false);
              addNotification({
                type: "success",
                title: "WAV Conversion Complete",
                message: "Your WAV file is ready for download.",
              });
            } else if (data.data.conversionStatus === "FAILED") {
              setIsConverting(false);
              addNotification({
                type: "error",
                title: "WAV Conversion Failed",
                message:
                  "There was an error converting your file to WAV format.",
              });
            }
          }
        } catch (error) {
          console.error("Error checking WAV conversion status:", error);
        }
      };

      // Check immediately and then every 2 seconds
      checkStatus();
      intervalId = setInterval(checkStatus, 2000);
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

      const response = await fetch(`/api/track/${trackId}/convert-wav`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type,
          componentId,
        }),
      });

      const data = await response.json();

      if (data.status === "success") {
        addNotification({
          type: "info",
          title: "WAV Conversion Started",
          message: "Your file is being converted to WAV format.",
        });
      } else if (data.status === "in_progress") {
        addNotification({
          type: "info",
          title: "WAV Conversion In Progress",
          message: "Your file is already being converted to WAV format.",
        });
      }
    } catch (error) {
      console.error("Error starting WAV conversion:", error);
      setIsConverting(false);
      addNotification({
        type: "error",
        title: "WAV Conversion Error",
        message: "Failed to start WAV conversion.",
      });
    }
  };

  return {
    status,
    isConverting,
    startConversion,
  };
}
