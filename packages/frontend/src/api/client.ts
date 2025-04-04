import {
  PaginationParams,
  Track,
  User,
  PaginatedResponse,
  License,
  TrackEventType,
  PlaybackSource,
  AudioFormat,
  TrackUsageResponse,
} from "@wavtopia/core-storage";

const API_URL = "/api";

interface FetchOptions extends RequestInit {
  token?: string | null;
  searchParams?: URLSearchParams;
  contentType?: string;
}

// TODO: This should be shared from the backend package
interface TrackUsageInput {
  eventType: TrackEventType;
  playbackSource?: PlaybackSource;
  format?: AudioFormat;
  duration?: number;
}

export const apiRequest = async <T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> => {
  const {
    token,
    searchParams,
    contentType,
    headers: customHeaders = {},
    ...rest
  } = options;

  const headers = new Headers(customHeaders);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  const url = new URL(`${API_URL}${endpoint}`, window.location.origin);
  if (searchParams) {
    url.search = searchParams.toString();
  }

  const response = await fetch(url.toString(), {
    headers,
    ...rest,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
};

export const api = {
  auth: {
    login: async (email: string, password: string) => {
      return apiRequest("/auth/login", {
        method: "POST",
        contentType: "application/json",
        body: JSON.stringify({ email, password }),
      });
    },

    register: async (
      email: string,
      username: string,
      password: string,
      inviteCode?: string
    ) => {
      // TODO: Rename the route to /auth/register, as the page is also called Register.
      // Will need a documentation update.
      return apiRequest("/auth/signup", {
        method: "POST",
        contentType: "application/json",
        body: JSON.stringify({ email, username, password, inviteCode }),
      });
    },

    requestEarlyAccess: async (email: string) => {
      return apiRequest("/auth/request-early-access", {
        method: "POST",
        contentType: "application/json",
        body: JSON.stringify({ email }),
      }) as Promise<{ success: boolean }>;
    },

    me: async (token: string) => {
      return apiRequest("/auth/me", { token });
    },

    getEnabledFeatures: async (token: string | null) => {
      return apiRequest("/auth/enabled-features", { token }) as Promise<{
        flags: string[];
      }>;
    },
  },

  admin: {
    getFeatureFlags: async (token: string) => {
      return apiRequest("/admin/feature-flags", { token });
    },

    createFeatureFlag: async (
      token: string,
      data: {
        name: string;
        description?: string;
        isEnabled?: boolean;
      }
    ) => {
      return apiRequest("/admin/feature-flags", {
        method: "POST",
        token,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    },

    updateFeatureFlag: async (
      token: string,
      id: string,
      data: { isEnabled?: boolean; description?: string }
    ) => {
      return apiRequest(`/admin/feature-flags/${id}`, {
        method: "PATCH",
        token,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    },

    getInviteCodes: async (token: string) => {
      return apiRequest("/admin/invite-codes", { token });
    },

    createInviteCode: async (
      token: string,
      data: { maxUses?: number; expiresAt?: Date; reference?: string }
    ) => {
      return apiRequest("/admin/invite-codes", {
        method: "POST",
        token,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    },

    updateInviteCode: async (
      token: string,
      id: string,
      data: { isActive: boolean }
    ) => {
      return apiRequest(`/admin/invite-codes/${id}`, {
        method: "PATCH",
        token,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    },
  },

  track: {
    get: async (id: string, token: string | null) => {
      return apiRequest(`/track/${id}`, { token }) as Promise<Track>;
    },

    share: async (id: string, userIds: string[], token: string) => {
      return apiRequest(`/track/${id}/share`, {
        method: "POST",
        token,
        contentType: "application/json",
        body: JSON.stringify({ userIds }),
      });
    },

    unshare: async (id: string, userIds: string[], token: string) => {
      return apiRequest(`/track/${id}/share`, {
        method: "DELETE",
        token,
        contentType: "application/json",
        body: JSON.stringify({ userIds }),
      });
    },

    updateVisibility: async (id: string, isPublic: boolean, token: string) => {
      return apiRequest(`/track/${id}/visibility`, {
        method: "PATCH",
        token,
        contentType: "application/json",
        body: JSON.stringify({ isPublic }),
      }) as Promise<Track>;
    },

    recordUsage: async (
      id: string,
      data: TrackUsageInput,
      token: string | null,
      stemId?: string
    ): Promise<TrackUsageResponse> => {
      const endpoint = stemId
        ? `/track/${id}/stem/${stemId}/usage`
        : `/track/${id}/usage`;

      return apiRequest(endpoint, {
        method: "POST",
        token,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    },

    upload: async (formData: FormData, token: string) => {
      return apiRequest("/track", {
        method: "POST",
        token,
        body: formData,
      }) as Promise<Track>;
    },

    update: async (
      id: string,
      data: {
        title: string;
        primaryArtistName: string;
        bpm?: number;
        key?: string;
        genreNames?: string[];
        description?: string;
        isExplicit: boolean;
        isPublic: boolean;
        licenseId: string;
        releaseDate?: string;
        releaseDatePrecision?: string;
      },
      token: string
    ) => {
      return apiRequest(`/track/${id}`, {
        method: "PATCH",
        token,
        contentType: "application/json",
        body: JSON.stringify(data),
      }) as Promise<Track>;
    },
  },

  tracks: {
    list: async (token: string, params?: PaginationParams) => {
      const searchParams = new URLSearchParams();
      if (params?.cursor) searchParams.set("cursor", params.cursor);
      if (params?.limit) searchParams.set("limit", params.limit.toString());

      return apiRequest("/tracks", { token, searchParams }) as Promise<
        PaginatedResponse<Track>
      >;
    },

    listPublic: async (params?: PaginationParams) => {
      const searchParams = new URLSearchParams();
      if (params?.cursor) searchParams.set("cursor", params.cursor);
      if (params?.limit) searchParams.set("limit", params.limit.toString());

      return apiRequest("/tracks/public", { searchParams }) as Promise<
        PaginatedResponse<Track>
      >;
    },

    listShared: async (token: string, params?: PaginationParams) => {
      const searchParams = new URLSearchParams();
      if (params?.cursor) searchParams.set("cursor", params.cursor);
      if (params?.limit) searchParams.set("limit", params.limit.toString());

      return apiRequest("/tracks/shared", { token, searchParams }) as Promise<
        PaginatedResponse<Track>
      >;
    },

    listAvailable: async (token: string, params?: PaginationParams) => {
      const searchParams = new URLSearchParams();
      if (params?.cursor) searchParams.set("cursor", params.cursor);
      if (params?.limit) searchParams.set("limit", params.limit.toString());

      return apiRequest("/tracks/available", {
        token,
        searchParams,
      }) as Promise<PaginatedResponse<Track>>;
    },

    delete: async (trackIds: string | string[], token: string) => {
      const ids = Array.isArray(trackIds) ? trackIds : [trackIds];
      return apiRequest("/tracks", {
        method: "DELETE",
        token,
        contentType: "application/json",
        body: JSON.stringify({ trackIds: ids }),
      });
    },
  },

  licenses: {
    get: async (id: string) => {
      return apiRequest(`/licenses/${id}`) as Promise<License>;
    },
  },

  users: {
    list: async (token: string) => {
      return apiRequest("/auth/users", { token }) as Promise<User[]>;
    },
  },

  notifications: {
    getNotifications: async (
      token: string,
      {
        limit,
        offset,
        includeRead,
      }: { limit?: number; offset?: number; includeRead?: boolean } = {}
    ) => {
      const params = new URLSearchParams();
      if (limit) params.append("limit", limit.toString());
      if (offset) params.append("offset", offset.toString());
      if (includeRead) params.append("includeRead", "true");

      return apiRequest(`/notifications?${params.toString()}`, { token });
    },

    getUnreadCount: async (token: string) => {
      return apiRequest("/notifications/unread-count", { token });
    },

    markAsRead: async (token: string, notificationId: string) => {
      return apiRequest(`/notifications/${notificationId}/read`, {
        method: "POST",
        token,
      });
    },

    markAllAsRead: async (token: string) => {
      return apiRequest("/notifications/mark-all-read", {
        method: "POST",
        token,
      });
    },
  },
};
