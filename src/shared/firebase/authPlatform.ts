import type { FirebaseApp } from 'firebase/app';
import type { Auth, UserCredential } from 'firebase/auth';
import { initializeAuth, inMemoryPersistence } from 'firebase/auth';

export const initializePlatformAuth = (app: FirebaseApp): Auth => initializeAuth(app, {
  persistence: inMemoryPersistence,
});

export const signInWithPlatformGoogle = async (_auth: Auth): Promise<UserCredential> => {
  throw Object.assign(new Error(`Google sign-in is available on the website. Native Google sign-in has not been configured.`), {
    code: `auth/unsupported-platform`,
  });
};
