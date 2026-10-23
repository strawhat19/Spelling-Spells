export const lockGrimoireStorage = <T,>(_key: string, operation: () => Promise<T>): Promise<T> => operation();
