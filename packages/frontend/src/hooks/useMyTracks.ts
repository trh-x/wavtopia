import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { useAuthToken } from "./useAuthToken";

export function useMyTracks() {
  const { getToken } = useAuthToken();
  const token = getToken();

  return useQuery({
    queryKey: ["tracks", token],
    queryFn: async () => (token ? api.tracks.list(token) : undefined),
    enabled: !!token,
  });
}
