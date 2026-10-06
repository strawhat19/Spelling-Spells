import AsyncStorage from '@react-native-async-storage/async-storage';

export const storageAdapter = {
  name: `Device Storage`,
  getItem: (key: string): Promise<string | null> => AsyncStorage.getItem(key),
  setItem: (key: string, value: string): Promise<void> => AsyncStorage.setItem(key, value),
};
