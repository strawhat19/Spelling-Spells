import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { connectAuthEmulator } from 'firebase/auth';
import { getApps, initializeApp } from 'firebase/app';
import { initializePlatformAuth } from './authPlatform';
import { getFirebaseConfig, firebaseEmulatorsRequested, shouldUseFirebaseEmulators } from './config';
import { initializeFirestore, memoryLocalCache, connectFirestoreEmulator } from 'firebase/firestore';

export type FirebaseRuntime = { auth: Auth; database: Firestore };

let runtime: FirebaseRuntime | null = null;

export const getFirebaseRuntime = (): FirebaseRuntime => {
  if (runtime) return runtime;
  const config = getFirebaseConfig();
  if (!config) {
    throw Object.assign(new Error(`Firebase account services need configuration.`), {
      code: `app/connection-required`,
    });
  }
  const useEmulators = shouldUseFirebaseEmulators(typeof __DEV__ !== `undefined` && __DEV__, config.projectId, firebaseEmulatorsRequested);
  const existingApp = getApps().find((entry) => entry.name === `spelling-spells`);
  if (existingApp && Object.entries(config).some(([key, value]) => existingApp.options[key as keyof typeof config] !== value)) {
    throw Object.assign(new Error(`Firebase configuration changed. Reload the app before connecting account services.`), {
      code: `app/config-mismatch`,
    });
  }
  const app = existingApp ?? initializeApp(config, `spelling-spells`);
  const auth = initializePlatformAuth(app);
  // Never accept a configurable host, real project, or production build for test routing.
  if (useEmulators) connectAuthEmulator(auth, `http://127.0.0.1:9099`, { disableWarnings: true });
  const database = initializeFirestore(app, { localCache: memoryLocalCache() });
  if (useEmulators) connectFirestoreEmulator(database, `127.0.0.1`, 8080);
  runtime = { auth, database };
  return runtime;
};
