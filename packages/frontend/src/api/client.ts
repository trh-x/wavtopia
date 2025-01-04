import { Track, User } from "../types";

const API_URL = "/api";

export const api = {
  auth: {
    login: async (email: string, password: string) => {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) throw new Error("Login failed");
      return response.json();
    },

    register: async (email: string, username: string, password: string) => {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, username, password }),
      });
      if (!response.ok) throw new Error("Registration failed");
      return response.json();
    },

    me: async (token: string) => {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to get user info");
      return response.json();
    },
  },

  tracks: {
    list: async (token: string) => {
      const response = await fetch(`${API_URL}/tracks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch tracks");
      return response.json() as Promise<Track[]>;
    },

    get: async (id: string, token: string) => {
      const response = await fetch(`${API_URL}/tracks/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch track");
      return response.json() as Promise<Track>;
    },

    listPublic: async () => {
      const response = await fetch(`${API_URL}/tracks/public`);
      if (!response.ok) throw new Error("Failed to fetch public tracks");
      return response.json() as Promise<Track[]>;
    },

    share: async (id: string, userIds: string[], token: string) => {
      const response = await fetch(`${API_URL}/tracks/${id}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userIds }),
      });
      if (!response.ok) throw new Error("Failed to share track");
      return response.json();
    },

    unshare: async (id: string, userIds: string[], token: string) => {
      const response = await fetch(`${API_URL}/tracks/${id}/share`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userIds }),
      });
      if (!response.ok) throw new Error("Failed to remove track sharing");
      return response.json();
    },

    updateVisibility: async (id: string, isPublic: boolean, token: string) => {
      const response = await fetch(`${API_URL}/tracks/${id}/visibility`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isPublic }),
      });
      if (!response.ok) throw new Error("Failed to update track visibility");
      return response.json() as Promise<Track>;
    },

    upload: async (formData: FormData, token: string) => {
      const response = await fetch(`${API_URL}/tracks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to upload track");
      return response.json() as Promise<Track>;
    },
  },

  users: {
    list: async (token: string) => {
      const response = await fetch(`${API_URL}/auth/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json() as Promise<User[]>;
    },
  },
};
