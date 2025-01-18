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
  const [sortField, setSortField] = useState<
    "createdAt" | "title" | "duration" | "artist"
  >("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const queryClient = useQueryClient();

  if (!token) {
    return <ErrorState message="Please log in to view your tracks" />;
  }

  const {
    tracks: userTracks,
    isLoading: isLoadingUserTracks,
    error: userTracksError,
    fetchNextPage: fetchNextUserTracks,
    isFetchingNextPage: isLoadingMoreUserTracks,
  } = useInfiniteTracks("/tracks", {
    sortField,
    sortDirection,
  });

  const {
    tracks: sharedTracks,
    isLoading: isLoadingSharedTracks,
    error: sharedTracksError,
    fetchNextPage: fetchNextSharedTracks,
    isFetchingNextPage: isLoadingMoreSharedTracks,
  } = useInfiniteTracks("/tracks/shared", {
    sortField,
    sortDirection,
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

  const handleSort = (
    field: typeof sortField,
    direction: typeof sortDirection
  ) => {
    setSortField(field);
    setSortDirection(direction);
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
            onSort={handleSort}
            currentSort={`${sortField}${
              sortDirection === "desc" ? "Desc" : "Asc"
            }`}
          />
        </TabsContent>

        <TabsContent value="shared">
          <TrackList
            tracks={sharedTracks}
            isLoading={isLoadingSharedTracks}
            error={sharedTracksError}
            onLoadMore={fetchNextSharedTracks}
            isLoadingMore={isLoadingMoreSharedTracks}
            onSort={handleSort}
            currentSort={`${sortField}${
              sortDirection === "desc" ? "Desc" : "Asc"
            }`}
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
