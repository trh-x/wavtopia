import { createContext, useContext, useState, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToasts } from "@/hooks/useToasts";
import { useTrackRegenerationPolling } from "@/hooks/useTrackRegenerationPolling";
import { useTrack } from "./TrackContext";

interface TrackRegenerationContextType {
  isTrackRegenerating: boolean;
  startTrackRegeneration: () => void;
}

const TrackRegenerationContext =
  createContext<TrackRegenerationContextType | null>(null);

export function TrackRegenerationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isTrackRegenerating, setIsTrackRegenerating] = useState(false);
  const { track } = useTrack();
  const queryClient = useQueryClient();
  const { addToast } = useToasts();

  // Poll for track regeneration
  useTrackRegenerationPolling({
    trackId: track.id,
    isRegenerating: isTrackRegenerating,
    onRegenerationComplete: () => {
      setIsTrackRegenerating(false);

      // Show success toast
      addToast({
        type: "success",
        title: "Track Regeneration Complete",
        message:
          "The full track has been regenerated and the waveform has been updated.",
      });

      // Invalidate and refetch track data to get the new waveform
      queryClient.invalidateQueries({
        queryKey: ["track", track.id],
        refetchType: "active",
      });
    },
  });

  const startTrackRegeneration = () => {
    setIsTrackRegenerating(true);

    // Show info toast about regeneration starting
    addToast({
      type: "info",
      title: "Track Regeneration Started",
      message:
        "The full track is being regenerated without the removed stem. You'll be notified when it's complete.",
    });
  };

  return (
    <TrackRegenerationContext.Provider
      value={{ isTrackRegenerating, startTrackRegeneration }}
    >
      {children}
    </TrackRegenerationContext.Provider>
  );
}

export function useTrackRegeneration() {
  const context = useContext(TrackRegenerationContext);
  if (!context) {
    throw new Error(
      "useTrackRegeneration must be used within TrackRegenerationProvider"
    );
  }
  return context;
}
