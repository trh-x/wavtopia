import { useState } from "react";
import { useAuthToken } from "./useAuthToken";

export function usePresignedUrl() {
  const { getToken } = useAuthToken();
  const [isLoading, setIsLoading] = useState(false);

  const getPresignedUrl = async (path: string): Promise<string> => {
    setIsLoading(true);
    try {
      const token = getToken();
      if (!token) {
        throw new Error("No auth token available");
      }

      const response = await fetch(path, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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
