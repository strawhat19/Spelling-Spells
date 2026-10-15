import { authAPI } from '../../api/auth';
import { createContext, useEffect, useState, type PropsWithChildren } from 'react';
import type { AuthSnapshot, AuthResult, EmailSignIn, EmailSignUp } from '../authentication/types';

export type AuthContextValue = AuthSnapshot & {
  loading: boolean;
  signOut: () => Promise<AuthResult>;
  sendVerification: () => Promise<AuthResult>;
  refreshIdentity: () => Promise<AuthResult>;
  retryHydration: () => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  updateProfile: (input: { displayName: string; avatarUrl: string | null }) => Promise<AuthResult>;
  signInWithEmail: (input: EmailSignIn) => Promise<AuthResult>;
  signUpWithEmail: (input: EmailSignUp) => Promise<AuthResult>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<AuthSnapshot>(authAPI.getSnapshot);

  useEffect(() => authAPI.subscribe((next) => {
    setSnapshot(next);
    setLoading(next.status === `loading`);
  }), []);

  return (
    <AuthContext.Provider value={{
      ...snapshot,
      loading,
      signOut: authAPI.signOut,
      sendVerification: authAPI.sendVerification,
      refreshIdentity: authAPI.refreshIdentity,
      retryHydration: authAPI.retryHydration,
      resetPassword: authAPI.resetPassword,
      updateProfile: authAPI.updateProfile,
      signInWithGoogle: authAPI.signInWithGoogle,
      signInWithEmail: authAPI.signInWithEmail,
      signUpWithEmail: authAPI.signUpWithEmail,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
