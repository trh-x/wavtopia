import { useAuthToken } from "../hooks/useAuthToken";

class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse(response: Response) {
  const data = await response.json();
  if (!response.ok) {
    throw new ApiError(response.status, data.message || "An error occurred");
  }
  return data;
}

export const api = {
  auth: {
    login: async (email: string, password: string) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      return handleResponse(response);
    },
    register: async (email: string, username: string, password: string) => {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });
      return handleResponse(response);
    },
    me: async (token: string) => {
      const response = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return handleResponse(response);
    },
  },
  tracks: {
    list: async (token: string) => {
      const response = await fetch("/api/tracks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return handleResponse(response);
    },
    get: async (id: string, token: string) => {
      const response = await fetch(`/api/tracks/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return handleResponse(response);
    },
    upload: async (formData: FormData, token: string) => {
      const response = await fetch("/api/tracks", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      return handleResponse(response);
    },
  },
};
