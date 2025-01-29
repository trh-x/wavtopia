import { useState } from "react";
import { useAuthToken } from "./useAuthToken";

// TODO: DRY this with useWavConversion

interface UseFlacConversionProps {
  trackId: string;
  type: "full" | "component";
  componentId?: string;
}

export function useFlacConversion({
  trackId,
  type,
  componentId,
}: UseFlacConversionProps) {
  const [isConverting, setIsConverting] = useState(false);
  const [status, setStatus] = useState<
    "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED"
  >("NOT_STARTED");
  const { appendTokenToUrl } = useAuthToken();

  const checkStatus = async () => {
    try {
      const endpoint =
        type === "full"
          ? `/api/track/${trackId}/flac-status`
          : `/api/track/${trackId}/component/${componentId}/flac-status`;

      const response = await fetch(appendTokenToUrl(endpoint));
      const data = await response.json();

      if (data.status === "success") {
        setStatus(data.data.conversionStatus);
        setIsConverting(data.data.conversionStatus === "IN_PROGRESS");
      }
    } catch (error) {
      console.error("Error checking FLAC conversion status:", error);
    }
  };

  const startConversion = async () => {
    try {
      setIsConverting(true);

      const response = await fetch(
        appendTokenToUrl("/api/track/convert-flac"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            trackId,
            type,
            ...(componentId && { componentId }),
          }),
        }
      );

      const data = await response.json();

      if (data.status === "success") {
        // Start polling for status
        const pollInterval = setInterval(async () => {
          await checkStatus();
          if (status === "COMPLETED" || status === "FAILED") {
            clearInterval(pollInterval);
            setIsConverting(false);
          }
        }, 2000);

        // Clean up interval on unmount
        return () => clearInterval(pollInterval);
      } else if (data.status === "in_progress") {
        setStatus("IN_PROGRESS");
      }
    } catch (error) {
      console.error("Error starting FLAC conversion:", error);
      setIsConverting(false);
    }
  };

  return {
    isConverting,
    status,
    startConversion,
  };
}
