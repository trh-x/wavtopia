const STORAGE_PREFIX = "wavtopia";

export const storage = {
  /**
   * Get a value from localStorage with prefixed key
   */
  get: (key: string): string | null => {
    return localStorage.getItem(`${STORAGE_PREFIX}:${key}`);
  },

  /**
   * Set a value in localStorage with prefixed key
   */
  set: (key: string, value: string): void => {
    localStorage.setItem(`${STORAGE_PREFIX}:${key}`, value);
  },

  /**
   * Remove a value from localStorage with prefixed key
   */
  remove: (key: string): void => {
    localStorage.removeItem(`${STORAGE_PREFIX}:${key}`);
  },

  /**
   * Clear all values with our prefix from localStorage
   */
  clearAll: (): void => {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(`${STORAGE_PREFIX}:`))
      .forEach((key) => localStorage.removeItem(key));
  },

  /**
   * Create a namespaced storage instance with additional prefix
   */
  namespace: (namespace: string) => {
    return {
      get: (key: string) => storage.get(`${namespace}:${key}`),
      set: (key: string, value: string) =>
        storage.set(`${namespace}:${key}`, value),
      remove: (key: string) => storage.remove(`${namespace}:${key}`),
      clearNamespace: () => {
        Object.keys(localStorage)
          .filter((key) => key.startsWith(`${STORAGE_PREFIX}:${namespace}:`))
          .forEach((key) => localStorage.removeItem(key));
      },
    };
  },
};
