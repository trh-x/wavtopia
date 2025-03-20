import { createContext, useContext, ReactNode } from "react";
import { Track } from "@/types";

interface TrackContextValue {
  track: Track;
  isLoading: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
}

const TrackContext = createContext<TrackContextValue | null>(null);

export function useTrack() {
  const context = useContext(TrackContext);
  if (!context) {
    throw new Error("useTrack must be used within a TrackProvider");
  }
  return context;
}

interface TrackProviderProps {
  children: ReactNode;
  value: TrackContextValue;
}

export function TrackProvider({ children, value }: TrackProviderProps) {
  return (
    <TrackContext.Provider value={value}>{children}</TrackContext.Provider>
  );
}
