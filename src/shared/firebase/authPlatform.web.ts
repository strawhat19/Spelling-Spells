import type { FirebaseApp } from 'firebase/app';
import type { Auth, UserCredential } from 'firebase/auth';
import {
  initializeAuth,
  signInWithPopup,
  GoogleAuthProvider,
  inMemoryPersistence,
  browserSessionPersistence,
  browserPopupRedirectResolver,
} from 'firebase/auth';

export const initializePlatformAuth = (app: FirebaseApp): Auth => initializeAuth(app, {
  persistence: [browserSessionPersistence, inMemoryPersistence],
  popupRedirectResolver: browserPopupRedirectResolver,
});

export const signInWithPlatformGoogle = (auth: Auth): Promise<UserCredential> => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: `select_account` });
  return signInWithPopup(auth, provider);
};
