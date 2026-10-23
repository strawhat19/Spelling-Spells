import { safeReturnPath } from '../routes';

const storageKey = `spelling-spells:signin-continuation:v1`;
export const rememberSignInContinuation = (path: string): void => {
  if (typeof window === `undefined`) return;
  try { window.sessionStorage.setItem(storageKey, JSON.stringify({ path: safeReturnPath(path), expires: Date.now() + 1800000 })); } catch {}
};
export const readSignInContinuation = (): string | null => {
  if (typeof window === `undefined`) return null;
  try {
    const value: unknown = JSON.parse(window.sessionStorage.getItem(storageKey) ?? `null`);
    if (!value || typeof value !== `object` || !(`path` in value) || !(`expires` in value) || typeof value.path !== `string` || typeof value.expires !== `number` || value.expires < Date.now()) return null;
    return safeReturnPath(value.path);
  } catch { return null; }
};
export const clearSignInContinuation = (): void => {
  if (typeof window === `undefined`) return;
  try { window.sessionStorage.removeItem(storageKey); } catch {}
};
