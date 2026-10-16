export const withGuestNotificationLock = <T,>(operation: () => Promise<T>): Promise<T> =>
  typeof navigator !== `undefined` && navigator.locks?.request
    ? navigator.locks.request(`spelling-spells:notifications:guest:v1`, operation)
    : operation();
