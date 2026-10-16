import { safeReturnPath } from '../routes';

const destinationKey = `spelling-spells:auth-return:v1`;

export const rememberAuthDestination = (path: string): void => {
  if (typeof window === `undefined`) return;
  try { window.sessionStorage.setItem(destinationKey, safeReturnPath(path)); } catch { /* Continue with the default account destination when storage is unavailable. */ }
};

export const consumeAuthDestination = (fallback?: string | string[]): string => {
  if (typeof window === `undefined`) return safeReturnPath(fallback);
  try {
    const saved = window.sessionStorage.getItem(destinationKey);
    window.sessionStorage.removeItem(destinationKey);
    return safeReturnPath(saved ?? fallback);
  } catch {
    return safeReturnPath(fallback);
  }
};
