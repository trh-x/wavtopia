import { Track, User } from "../types";

const API_URL = "/api";

interface FetchOptions extends RequestInit {
  token?: string | null;
  contentType?: string;
}

const apiRequest = async (endpoint: string, options: FetchOptions = {}) => {
  const { token, contentType, headers: customHeaders = {}, ...rest } = options;

  const headers = new Headers(customHeaders);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
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
      return apiRequest("/auth/register", {
        method: "POST",
        contentType: "application/json",
        body: JSON.stringify({ email, username, password, inviteCode }),
      });
    },

    checkEarlyAccess: async () => {
      return apiRequest("/auth/early-access");
    },

    me: async (token: string) => {
      return apiRequest("/auth/me", { token });
    },
  },

  admin: {
    getFeatureFlags: async () => {
      return apiRequest("/admin/feature-flags");
    },

    createFeatureFlag: async (data: {
      name: string;
      description?: string;
      isEnabled?: boolean;
    }) => {
      return apiRequest("/admin/feature-flags", {
        method: "POST",
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    },

    updateFeatureFlag: async (
      id: string,
      data: { isEnabled?: boolean; description?: string }
    ) => {
      return apiRequest(`/admin/feature-flags/${id}`, {
        method: "PATCH",
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    },

    getInviteCodes: async () => {
      return apiRequest("/admin/invite-codes");
    },

    createInviteCode: async (data: { maxUses?: number; expiresAt?: Date }) => {
      return apiRequest("/admin/invite-codes", {
        method: "POST",
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    },

    updateInviteCode: async (id: string, data: { isActive: boolean }) => {
      return apiRequest(`/admin/invite-codes/${id}`, {
        method: "PATCH",
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

    upload: async (formData: FormData, token: string) => {
      return apiRequest("/track", {
        method: "POST",
        token,
        body: formData,
      }) as Promise<Track>;
    },
  },

  tracks: {
    list: async (token: string) => {
      return apiRequest("/tracks", { token }) as Promise<Track[]>;
    },

    listPublic: async () => {
      return apiRequest("/tracks/public") as Promise<Track[]>;
    },

    listShared: async (token: string) => {
      return apiRequest("/tracks/shared", { token }) as Promise<Track[]>;
    },

    listAvailable: async (token: string) => {
      return apiRequest("/tracks/available", { token }) as Promise<Track[]>;
    },
  },

  users: {
    list: async (token: string) => {
      return apiRequest("/auth/users", { token }) as Promise<User[]>;
    },
  },
};
