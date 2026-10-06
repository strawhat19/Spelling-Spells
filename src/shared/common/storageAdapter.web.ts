export const storageAdapter = {
  name: `Browser Local Storage`,
  getItem: async (key: string): Promise<string | null> => {
    if (typeof window === `undefined`) {
      throw new Error(`Browser Storage Unavailable`);
    }
    return window.localStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (typeof window === `undefined`) {
      throw new Error(`Browser Storage Unavailable`);
    }
    window.localStorage.setItem(key, value);
  },
};
