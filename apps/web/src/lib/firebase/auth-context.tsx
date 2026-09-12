'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from './client';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /** False when NEXT_PUBLIC_FIREBASE_* env vars are missing (e.g. no live Firebase project has been created yet — see docs/HANDOFF.md). Screens should show a setup message instead of a sign-in form. */
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Company/Super Admin accounts are created or invited by an admin (see
 * docs/flows/SUPER-ADMIN-FLOW.md) — there is no public self-signup form in
 * this MVP, so this context only exposes sign-in/sign-out, not registration.
 *
 * Firebase initialization is skipped entirely when env vars are missing, so
 * an environment with no Firebase project configured yet (e.g. a fresh
 * Vercel deploy before real credentials are set) renders a normal page
 * instead of crashing with Next.js's generic "Application error".
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    configured,
    signIn: async (email, password) => {
      await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    },
    signOut: async () => {
      await firebaseSignOut(getFirebaseAuth());
    },
    getIdToken: async () => {
      const currentUser = getFirebaseAuth().currentUser;
      if (!currentUser) return null;
      return currentUser.getIdToken();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
