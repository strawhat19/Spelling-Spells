export const withGuestNotificationLock = <T,>(operation: () => Promise<T>): Promise<T> => operation();
