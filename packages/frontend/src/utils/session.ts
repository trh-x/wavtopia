import { storage } from "./storage";

const anonIdStorage = storage.namespace("session");

/**
 * Generate a random session ID
 */
const generateSessionId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const session = {
  /**
   * Get the current anonymous session ID, creating one if it doesn't exist
   */
  getAnonId: (): string => {
    let sessionId = anonIdStorage.get("anon-id");
    if (!sessionId) {
      sessionId = generateSessionId();
      anonIdStorage.set("anon-id", sessionId);
    }
    return sessionId;
  },

  /**
   * Clear the anonymous session ID
   */
  clearAnonId: (): void => {
    anonIdStorage.remove("anon-id");
  },
};
