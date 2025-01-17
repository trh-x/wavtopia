import { Track, PaginatedResponse, PaginationParams } from "../types";

const API_BASE_URL = "/api";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || response.statusText);
  }
  return response.json();
}

export const api = {
  auth: {
    login: async (email: string, password: string) => {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      return handleResponse<{ token: string; user: any }>(response);
    },

    register: async (data: {
      email: string;
      username: string;
      password: string;
      inviteCode?: string;
    }) => {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      return handleResponse<{ token: string; user: any }>(response);
    },

    me: async (token: string) => {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return handleResponse<{ user: any }>(response);
    },

    getEnabledFeatures: async (token: string | null) => {
      const response = await fetch(`${API_BASE_URL}/auth/features`, {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
      });
      return handleResponse<{ flags: string[] }>(response);
    },
  },

  tracks: {
    list: async (token: string, params?: PaginationParams) => {
      const searchParams = new URLSearchParams();
      if (params?.cursor) searchParams.set("cursor", params.cursor);
      if (params?.limit) searchParams.set("limit", params.limit.toString());

      const response = await fetch(
        `${API_BASE_URL}/tracks?${searchParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return handleResponse<PaginatedResponse<Track>>(response);
    },

    listPublic: async (params?: PaginationParams) => {
      const searchParams = new URLSearchParams();
      if (params?.cursor) searchParams.set("cursor", params.cursor);
      if (params?.limit) searchParams.set("limit", params.limit.toString());

      const response = await fetch(
        `${API_BASE_URL}/tracks/public?${searchParams.toString()}`
      );
      return handleResponse<PaginatedResponse<Track>>(response);
    },

    listShared: async (token: string, params?: PaginationParams) => {
      const searchParams = new URLSearchParams();
      if (params?.cursor) searchParams.set("cursor", params.cursor);
      if (params?.limit) searchParams.set("limit", params.limit.toString());

      const response = await fetch(
        `${API_BASE_URL}/tracks/shared?${searchParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return handleResponse<PaginatedResponse<Track>>(response);
    },

    listAvailable: async (token: string, params?: PaginationParams) => {
      const searchParams = new URLSearchParams();
      if (params?.cursor) searchParams.set("cursor", params.cursor);
      if (params?.limit) searchParams.set("limit", params.limit.toString());

      const response = await fetch(
        `${API_BASE_URL}/tracks/available?${searchParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return handleResponse<PaginatedResponse<Track>>(response);
    },
  },

  track: {
    get: async (token: string, id: string) => {
      const response = await fetch(`${API_BASE_URL}/track/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return handleResponse<Track>(response);
    },

    upload: async (formData: FormData, token: string) => {
      const response = await fetch(`${API_BASE_URL}/track`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      return handleResponse<Track>(response);
    },

    delete: async (token: string, trackId: string) => {
      const response = await fetch(`${API_BASE_URL}/track/${trackId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return handleResponse<void>(response);
    },

    batchDelete: async (token: string, trackIds: string[]) => {
      const response = await fetch(`${API_BASE_URL}/track/batch`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ trackIds }),
      });
      return handleResponse<void>(response);
    },

    share: async (token: string, trackId: string, userIds: string[]) => {
      const response = await fetch(`${API_BASE_URL}/track/${trackId}/share`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userIds }),
      });
      return handleResponse<void>(response);
    },

    unshare: async (token: string, trackId: string, userIds: string[]) => {
      const response = await fetch(`${API_BASE_URL}/track/${trackId}/share`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userIds }),
      });
      return handleResponse<void>(response);
    },

    updateVisibility: async (
      token: string,
      trackId: string,
      isPublic: boolean
    ) => {
      const response = await fetch(
        `${API_BASE_URL}/track/${trackId}/visibility`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ isPublic }),
        }
      );
      return handleResponse<Track>(response);
    },
  },
};
