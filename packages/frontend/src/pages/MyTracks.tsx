import { useAuthToken } from "@/hooks/useAuthToken";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { TrackList } from "@/components/track-list/TrackList";
import { ErrorState } from "@/components/ui/ErrorState";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { BatchActionsBar } from "@/components/BatchActionsBar";
import { useInfiniteTracks } from "@/hooks/useInfiniteTracks";

export function MyTracks() {
  const { token } = useAuthToken();
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  if (!token) {
    return <ErrorState message="Please log in to view your tracks" />;
  }

  const {
    tracks: userTracks,
    isLoading: isLoadingUserTracks,
    error: userTracksError,
    fetchNextPage: fetchNextUserTracks,
    isLoadingMore: isLoadingMoreUserTracks,
  } = useInfiniteTracks({
    queryKey: ["tracks", token],
    fetchFn: (cursor) => api.tracks.list(token, { cursor }),
  });

  const {
    tracks: sharedTracks,
    isLoading: isLoadingSharedTracks,
    error: sharedTracksError,
    fetchNextPage: fetchNextSharedTracks,
    isLoadingMore: isLoadingMoreSharedTracks,
  } = useInfiniteTracks({
    queryKey: ["shared-tracks", token],
    fetchFn: (cursor) => api.tracks.listShared(token, { cursor }),
  });

  const deleteTrackMutation = useMutation({
    mutationFn: async (trackId: string) => {
      await api.track.delete(token, trackId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
    },
  });

  const deleteTracksMutation = useMutation({
    mutationFn: async (trackIds: string[]) => {
      await api.track.batchDelete(trackIds, token);
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
      <Tabs defaultValue="my-tracks">
        <TabsList className="mb-8">
          <TabsTrigger value="my-tracks">My Tracks</TabsTrigger>
          <TabsTrigger value="shared">Shared With Me</TabsTrigger>
        </TabsList>

        <TabsContent value="my-tracks">
          <TrackList
            tracks={userTracks}
            isLoading={isLoadingUserTracks}
            error={userTracksError}
            selectable={true}
            selectedTracks={selectedTracks}
            onTrackSelect={handleTrackSelect}
            onDeleteTrack={deleteTrackMutation.mutate}
            onLoadMore={fetchNextUserTracks}
            isLoadingMore={isLoadingMoreUserTracks}
          />
        </TabsContent>

        <TabsContent value="shared">
          <TrackList
            tracks={sharedTracks}
            isLoading={isLoadingSharedTracks}
            error={sharedTracksError}
            onLoadMore={fetchNextSharedTracks}
            isLoadingMore={isLoadingMoreSharedTracks}
          />
        </TabsContent>
      </Tabs>

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
