import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useStemProcessingById } from "@/hooks/useStemProcessingById";
import { useToasts } from "@/hooks/useToasts";
import { Track, Stem } from "@/types";

interface StemProcessingWatcherProps {
  track: Track;
  stem: Stem;
  isProcessing: boolean;
  onProcessingComplete: () => void;
}

export function StemProcessingWatcher({
  track,
  stem,
  isProcessing,
  onProcessingComplete,
}: StemProcessingWatcherProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToasts();

  useStemProcessingById({
    trackId: track.id,
    stemId: stem.id,
    isProcessing,
    onProcessingComplete: () => {
      // Show completion toast
      addToast({
        type: "success",
        title: "Stem Processing Complete",
        message: `${stem.name} has been processed successfully. The waveform has been updated.`,
      });

      // Invalidate track data to refresh the UI
      queryClient.invalidateQueries({
        queryKey: ["track", track.id],
        refetchType: "active",
      });

      // Call the parent callback
      onProcessingComplete();
    },
  });

  return null; // This component doesn't render anything
}
