import { useInfiniteQuery } from "@tanstack/react-query";
import { Track, PaginatedResponse } from "@/types";
import { useAuthToken } from "./useAuthToken";
import { apiRequest } from "@/api/client";

type SortField = "createdAt" | "title" | "duration" | "artist";
type SortDirection = "asc" | "desc";

type UseInfiniteTracksOptions = {
  sortField?: SortField;
  sortDirection?: SortDirection;
};

export function useInfiniteTracks(
  endpoint:
    | "/tracks"
    | "/tracks/shared"
    | "/tracks/public"
    | "/tracks/available",
  options: UseInfiniteTracksOptions = {}
) {
  const { token } = useAuthToken();
  const { sortField = "createdAt", sortDirection = "desc" } = options;

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [endpoint, token, sortField, sortDirection],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      if (pageParam) params.append("cursor", pageParam);
      if (sortField) params.append("sortField", sortField);
      if (sortDirection) params.append("sortDirection", sortDirection);

      return apiRequest<PaginatedResponse<Track>>(
        `${endpoint}?${params.toString()}`,
        {
          method: "GET",
          token,
        }
      );
    },
    getNextPageParam: (lastPage: PaginatedResponse<Track>) =>
      lastPage.metadata.nextCursor,
    initialPageParam: undefined as string | undefined,
  });

  const tracks = data?.pages.flatMap((page) => page.items) || [];

  return {
    tracks,
    isLoading,
    error,
    hasNextPage,
    fetchNextPage: hasNextPage ? () => fetchNextPage() : undefined,
    isFetchingNextPage,
  };
}
