import { useLocalStorage } from '../config';
import { queueStorageOperation, readStoredPreference, writeStoredPreference } from '../common/storage';

export type DeviceProfile = { version: 1; nickname: string; readingNote: string };
const key = `spelling-spells:device-profile:v1`;
export const emptyDeviceProfile = (): DeviceProfile => ({ version: 1, nickname: ``, readingNote: `` });
const valid = (value: unknown): value is DeviceProfile => {
  if (!value || typeof value !== `object` || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return item.version === 1 && typeof item.nickname === `string` && item.nickname.length <= 80
    && typeof item.readingNote === `string` && item.readingNote.length <= 500;
};
export const loadDeviceProfile = () => readStoredPreference(key, `Device profile`, valid, emptyDeviceProfile());
export const saveDeviceProfile = (value: DeviceProfile) => queueStorageOperation(key, async () => {
  if (!valid(value)) throw new Error(`Use a nickname up to 80 characters and a reading note up to 500 characters.`);
  await writeStoredPreference(key, `Device profile`, { version: 1, nickname: value.nickname, readingNote: value.readingNote });
  return useLocalStorage;
});
