import type { FirebaseOptions } from 'firebase/app';

// Deliberate release hold: environment values alone must not activate unfinished account setup.
// Change only after the intended project, rules, domains and connected validation are approved.
export const accountConnectionReleased = false;

const clientConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
};

export const firebaseConfigured = accountConnectionReleased && Object.values(clientConfig).every((value) => Boolean(value?.trim()));

export const getFirebaseConfig = (): FirebaseOptions | null => firebaseConfigured ? clientConfig : null;

export const firebaseEmulatorsRequested = process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS === `1`;

export const shouldUseFirebaseEmulators = (development: boolean, projectId: string | undefined, requested: boolean): boolean => {
  if (!requested) return false;
  if (!development || projectId !== `demo-spelling-spells`) {
    throw Object.assign(new Error(`Emulators require the demo development project; remove the emulator flag for a real or production build.`), {
      code: `app/emulator-forbidden`,
    });
  }
  return true;
};
