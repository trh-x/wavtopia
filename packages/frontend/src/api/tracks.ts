import { api } from "./client";
import { useAuthToken } from "../hooks/useAuthToken";

export async function deleteTrack(trackId: string): Promise<void> {
  const { getToken } = useAuthToken();
  const token = getToken();
  if (!token) throw new Error("No token available");
  await api.track.delete(trackId, token);
}
