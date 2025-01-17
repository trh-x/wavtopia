import { useAuthToken } from "@/hooks/useAuthToken";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/api/client";
import { TrackSection } from "@/components/track-list/TrackList";
import { ErrorState } from "@/components/ui/ErrorState";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Track, PaginatedResponse } from "@/types";

export function MyTracks() {
  const { token } = useAuthToken();
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const {
    data: userTracksData,
    isLoading: isLoadingUserTracks,
    error: userTracksError,
    fetchNextPage: fetchNextUserTracks,
    hasNextPage: hasNextUserTracksPage,
    isFetchingNextPage: isFetchingNextUserTracksPage,
  } = useInfiniteQuery({
    queryKey: ["tracks", token],
    queryFn: ({ pageParam }) => api.tracks.list(token!, { cursor: pageParam }),
    enabled: !!token,
    getNextPageParam: (lastPage: PaginatedResponse<Track>) =>
      lastPage.metadata.nextCursor,
    initialPageParam: undefined as string | undefined,
  });

  const {
    data: sharedTracksData,
    isLoading: isLoadingSharedTracks,
    error: sharedTracksError,
    fetchNextPage: fetchNextSharedTracks,
    hasNextPage: hasNextSharedTracksPage,
    isFetchingNextPage: isFetchingNextSharedTracksPage,
  } = useInfiniteQuery({
    queryKey: ["shared-tracks", token],
    queryFn: ({ pageParam }) =>
      api.tracks.listShared(token!, { cursor: pageParam }),
    enabled: !!token,
    getNextPageParam: (lastPage: PaginatedResponse<Track>) =>
      lastPage.metadata.nextCursor,
    initialPageParam: undefined as string | undefined,
  });

  const deleteTrackMutation = useMutation({
    mutationFn: async (trackId: string) => {
      if (!token) return;
      await api.track.delete(token, trackId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
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

  if (!token) {
    return <ErrorState message="Please log in to view your tracks" />;
  }

  const userTracks = userTracksData?.pages.flatMap((page) => page.items) || [];
  const sharedTracks =
    sharedTracksData?.pages.flatMap((page) => page.items) || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <Tabs defaultValue="my-tracks">
        <TabsList className="mb-8">
          <TabsTrigger value="my-tracks">My Tracks</TabsTrigger>
          <TabsTrigger value="shared">Shared With Me</TabsTrigger>
        </TabsList>

        <TabsContent value="my-tracks">
          <TrackSection
            title=""
            tracks={userTracks}
            isLoading={isLoadingUserTracks}
            error={userTracksError}
            selectable={true}
            selectedTracks={selectedTracks}
            onTrackSelect={handleTrackSelect}
            onDeleteTrack={deleteTrackMutation.mutate}
            onLoadMore={
              hasNextUserTracksPage ? () => fetchNextUserTracks() : undefined
            }
            isLoadingMore={isFetchingNextUserTracksPage}
          />
        </TabsContent>

        <TabsContent value="shared">
          <TrackSection
            title=""
            tracks={sharedTracks}
            isLoading={isLoadingSharedTracks}
            error={sharedTracksError}
            onLoadMore={
              hasNextSharedTracksPage
                ? () => fetchNextSharedTracks()
                : undefined
            }
            isLoadingMore={isFetchingNextSharedTracksPage}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
