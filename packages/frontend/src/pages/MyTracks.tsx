import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthToken } from "../hooks/useAuthToken";
import { api } from "../api/client";
import { TrackSection } from "../components/track-list/TrackList";
import { BatchActionsBar } from "../components/BatchActionsBar";

export function MyTracks() {
  const { getToken } = useAuthToken();
  const token = getToken();
  const queryClient = useQueryClient();
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());

  const {
    data: userTracks,
    isLoading: isLoadingUserTracks,
    error: userTracksError,
  } = useQuery({
    queryKey: ["tracks", token],
    queryFn: async () => (token ? api.tracks.list(token) : undefined),
    enabled: !!token,
  });

  const {
    data: sharedTracks,
    isLoading: isLoadingSharedTracks,
    error: sharedTracksError,
  } = useQuery({
    queryKey: ["shared-tracks", token],
    queryFn: async () => (token ? api.tracks.listShared(token) : undefined),
    enabled: !!token,
  });

  const deleteTrackMutation = useMutation({
    mutationFn: (trackId: string) => {
      if (!token) {
        throw new Error("No token available");
      }
      return api.track.delete(trackId, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
    },
  });

  const deleteTracksMutation = useMutation({
    mutationFn: (trackIds: string[]) => {
      if (!token) {
        throw new Error("No token available");
      }
      return api.track.batchDelete(trackIds, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
      setSelectedTracks(new Set());
    },
  });

  const handleTrackSelect = (trackId: string) => {
    setSelectedTracks((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      return next;
    });
  };

  const handleDeleteTracks = () => {
    if (selectedTracks.size > 0) {
      deleteTracksMutation.mutate(Array.from(selectedTracks));
    }
  };

  const handleCancelSelection = () => {
    setSelectedTracks(new Set());
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Your Tracks</h1>

      <TrackSection
        title=""
        tracks={userTracks}
        isLoading={isLoadingUserTracks}
        error={userTracksError}
        selectable={true}
        selectedTracks={selectedTracks}
        onTrackSelect={handleTrackSelect}
        onDeleteTrack={deleteTrackMutation.mutate}
      />

      <TrackSection
        title="Shared With You"
        tracks={sharedTracks}
        isLoading={isLoadingSharedTracks}
        error={sharedTracksError}
      />

      {selectedTracks.size > 0 && (
        <BatchActionsBar
          selectedCount={selectedTracks.size}
          onDelete={handleDeleteTracks}
          onCancelSelection={handleCancelSelection}
        />
      )}
    </div>
  );
}
