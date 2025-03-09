import { useState } from "react";
import { useAuthToken } from "./useAuthToken";

// TODO: Can this be simplified using useQuery?
export function usePresignedUrl() {
  const { getToken } = useAuthToken();
  const [isLoading, setIsLoading] = useState(false);

  const getPresignedUrl = async (path: string): Promise<string> => {
    setIsLoading(true);
    try {
      const token = getToken();

      const options = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : {};

      const response = await fetch(path, options);

      if (!response.ok) {
        throw new Error(`Failed to get presigned URL: ${response.statusText}`);
      }

      const data = await response.json();
      return data.url;
    } finally {
      setIsLoading(false);
    }
  };

  return { getPresignedUrl, isLoading };
}
