import { authAPI } from '../../api/auth';
import { createContext, useEffect, useState, type PropsWithChildren } from 'react';
import type { AuthSnapshot, AuthResult, EmailSignIn, EmailSignUp } from '../authentication/types';

export type AuthContextValue = AuthSnapshot & {
  loading: boolean;
  signOut: () => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signInWithEmail: (input: EmailSignIn) => Promise<AuthResult>;
  signUpWithEmail: (input: EmailSignUp) => Promise<AuthResult>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<AuthSnapshot>(authAPI.getSnapshot);

  useEffect(() => authAPI.subscribe((next) => {
    setSnapshot(next);
    setLoading(false);
  }), []);

  return (
    <AuthContext.Provider value={{
      ...snapshot,
      loading,
      signOut: authAPI.signOut,
      signInWithGoogle: authAPI.signInWithGoogle,
      signInWithEmail: authAPI.signInWithEmail,
      signUpWithEmail: authAPI.signUpWithEmail,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
