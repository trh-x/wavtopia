import { useInfiniteQuery } from "@tanstack/react-query";
import { Track, PaginatedResponse } from "@/types";
import { api } from "@/api/client";

type UseInfiniteTracksOptions = {
  queryKey: string[];
  fetchFn: (cursor?: string) => Promise<PaginatedResponse<Track>>;
};

export function useInfiniteTracks({
  queryKey,
  fetchFn,
}: UseInfiniteTracksOptions) {
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchFn(pageParam),
    getNextPageParam: (lastPage: PaginatedResponse<Track>) =>
      lastPage.metadata.nextCursor,
    initialPageParam: undefined as string | undefined,
  });

  const tracks = data?.pages.flatMap((page) => page.items) || [];

  return {
    tracks,
    isLoading,
    error,
    fetchNextPage: hasNextPage ? () => fetchNextPage() : undefined,
    isLoadingMore: isFetchingNextPage,
  };
}
