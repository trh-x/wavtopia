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

  console.log(
    `🔄 [TrackRegeneration] Provider render - track ${track.id}, isTrackRegenerating: ${isTrackRegenerating}`
  );

  // Poll for track regeneration
  useTrackRegenerationPolling({
    trackId: track.id,
    isRegenerating: isTrackRegenerating,
    onRegenerationComplete: () => {
      console.log(
        `✅ [TrackRegeneration] Track regeneration completed for track ${track.id}`
      );

      setIsTrackRegenerating(false);
      console.log(
        `🔄 [TrackRegeneration] Set isTrackRegenerating to false for track ${track.id}`
      );

      // Show success toast
      console.log(
        `🍞 [TrackRegeneration] Showing success toast for track ${track.id}`
      );
      addToast({
        type: "success",
        title: "Track Regeneration Complete",
        message:
          "The full track has been regenerated and the waveform has been updated.",
      });

      // Invalidate and refetch track data to get the new waveform
      console.log(
        `🔄 [TrackRegeneration] Invalidating queries for track ${track.id}`
      );
      queryClient.invalidateQueries({
        queryKey: ["track", track.id],
        refetchType: "active",
      });
    },
  });

  const startTrackRegeneration = () => {
    console.log(
      `🚀 [TrackRegeneration] Starting track regeneration for track ${track.id}`
    );
    setIsTrackRegenerating(true);
    console.log(
      `🔄 [TrackRegeneration] Set isTrackRegenerating to true for track ${track.id}`
    );

    // Show info toast about regeneration starting
    console.log(
      `🍞 [TrackRegeneration] Showing start toast for track ${track.id}`
    );
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
