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
      // TODO: Rename the route to /auth/register, as the page is also called Register.
      // Will need a documentation update.
      return apiRequest("/auth/signup", {
        method: "POST",
        contentType: "application/json",
        body: JSON.stringify({ email, username, password, inviteCode }),
      });
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
      data: { maxUses?: number; expiresAt?: Date }
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
