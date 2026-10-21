export const withGuestNotificationLock = async <T,>(operation: () => Promise<T>): Promise<T> =>
  typeof navigator !== `undefined` && navigator.locks?.request
    ? await navigator.locks.request(`spelling-spells:notifications:guest:v1`, operation)
    : await operation();
