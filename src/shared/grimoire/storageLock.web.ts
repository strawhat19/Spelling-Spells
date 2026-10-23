export const lockGrimoireStorage = <T,>(key: string, operation: () => Promise<T>): Promise<T> => {
  if (typeof navigator !== `undefined` && navigator.locks?.request) return navigator.locks.request(key, operation);
  return operation();
};
