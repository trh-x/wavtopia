import { storage } from "./storage";

const authStorage = storage.namespace("auth");

export const auth = {
  /**
   * Get the stored auth token
   */
  getToken: (): string | null => {
    return authStorage.get("token");
  },

  /**
   * Set the auth token
   */
  setToken: (token: string): void => {
    authStorage.set("token", token);
  },

  /**
   * Remove the auth token
   */
  removeToken: (): void => {
    authStorage.remove("token");
  },

  /**
   * Append token to URL if available
   */
  appendTokenToUrl: (url: string): string => {
    const token = auth.getToken();
    return token ? `${url}?token=${token}` : url;
  },
};
