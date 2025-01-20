import { useAuthToken } from "@/hooks/useAuthToken";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { TrackList } from "@/components/track-list/TrackList";
import { ErrorState } from "@/components/ui/ErrorState";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { BatchActionsBar } from "@/components/BatchActionsBar";
import { useInfiniteTracks } from "@/hooks/useInfiniteTracks";
import { useTrackSort } from "@/hooks/useTrackSort";

function UserTracksTab({
  selectedTracks,
  onTrackSelect,
  onDeleteTrack,
}: {
  selectedTracks: Set<string>;
  onTrackSelect: (trackId: string) => void;
  onDeleteTrack: (trackId: string) => void;
}) {
  const { sortField, sortDirection, handleSort, currentSortValue } =
    useTrackSort();
  const { tracks, isLoading, error, fetchNextPage, isFetchingNextPage } =
    useInfiniteTracks("/tracks", {
      sortField,
      sortDirection,
    });

  return (
    <TrackList
      tracks={tracks}
      isLoading={isLoading}
      error={error}
      selectable={true}
      selectedTracks={selectedTracks}
      onTrackSelect={onTrackSelect}
      onDeleteTrack={onDeleteTrack}
      onLoadMore={fetchNextPage}
      isLoadingMore={isFetchingNextPage}
      onSort={handleSort}
      currentSort={currentSortValue}
    />
  );
}

function SharedTracksTab() {
  const { sortField, sortDirection, handleSort, currentSortValue } =
    useTrackSort();
  const { tracks, isLoading, error, fetchNextPage, isFetchingNextPage } =
    useInfiniteTracks("/tracks/shared", {
      sortField,
      sortDirection,
    });

  return (
    <TrackList
      tracks={tracks}
      isLoading={isLoading}
      error={error}
      onLoadMore={fetchNextPage}
      isLoadingMore={isFetchingNextPage}
      onSort={handleSort}
      currentSort={currentSortValue}
    />
  );
}

export function MyTracks() {
  const { token } = useAuthToken();
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  if (!token) {
    return <ErrorState message="Please log in to view your tracks" />;
  }

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
          <UserTracksTab
            selectedTracks={selectedTracks}
            onTrackSelect={handleTrackSelect}
            onDeleteTrack={deleteTrackMutation.mutate}
          />
        </TabsContent>

        <TabsContent value="shared">
          <SharedTracksTab />
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
