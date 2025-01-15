import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TrackList } from "@/components/TrackList";
import { BatchActionsBar } from "@/components/BatchActionsBar";
import { deleteTrack } from "@/api/tracks";
import { useMyTracks } from "@/hooks/useMyTracks";

export function MyTracks() {
  const queryClient = useQueryClient();
  const { data: tracks, isLoading, error } = useMyTracks();
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());

  const deleteTrackMutation = useMutation({
    mutationFn: deleteTrack,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
    },
  });

  const deleteTracksMutation = useMutation({
    mutationFn: async (trackIds: string[]) => {
      await Promise.all(trackIds.map((id) => deleteTrack(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
      setSelectedTracks(new Set());
      setIsSelectionMode(false);
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

  const handleDeleteTrack = (trackId: string) => {
    deleteTrackMutation.mutate(trackId);
  };

  const handleDeleteSelectedTracks = () => {
    deleteTracksMutation.mutate(Array.from(selectedTracks));
  };

  const handleCancelSelection = () => {
    setSelectedTracks(new Set());
    setIsSelectionMode(false);
  };

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Tracks</h1>
        {!isSelectionMode && (
          <button
            onClick={() => setIsSelectionMode(true)}
            className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
          >
            Select Tracks
          </button>
        )}
      </div>
      <TrackList
        title=""
        tracks={tracks}
        isLoading={isLoading}
        error={error}
        selectable={isSelectionMode}
        selectedTracks={selectedTracks}
        onTrackSelect={handleTrackSelect}
        onDeleteTrack={!isSelectionMode ? handleDeleteTrack : undefined}
      />
      {isSelectionMode && selectedTracks.size > 0 && (
        <BatchActionsBar
          selectedCount={selectedTracks.size}
          onDelete={handleDeleteSelectedTracks}
          onCancelSelection={handleCancelSelection}
        />
      )}
    </div>
  );
}
