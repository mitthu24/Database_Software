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
import {
  isTempAuthEnabled,
  getStoredToken,
  getStoredEmail,
  setStoredSession,
  clearStoredSession,
} from '../temp-auth';

/** Minimal shape used in temp-auth mode — real Firebase mode still uses the full SDK `User`. */
type SessionUser = Pick<User, 'email'> | User;

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  /** False when neither temp-auth nor real Firebase is usable. Screens should show a setup message instead of a sign-in form. */
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
 * TEMPORARY branch (see docs/HANDOFF.md "temporary email/password auth"):
 * when NEXT_PUBLIC_TEMP_AUTH_ENABLED=true, Firebase is bypassed entirely —
 * `signIn` calls the API's `/auth/login` instead and the resulting token is
 * kept in localStorage. This only exists because no live Firebase project
 * has been created yet; delete this branch (and the temp-auth module) once
 * one is.
 *
 * Otherwise, Firebase initialization is skipped entirely when env vars are
 * missing, so an environment with no Firebase project configured yet (e.g.
 * a fresh Vercel deploy before real credentials are set) renders a normal
 * page instead of crashing with Next.js's generic "Application error".
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const tempAuth = isTempAuthEnabled();
  const configured = tempAuth || isFirebaseConfigured();

  useEffect(() => {
    if (tempAuth) {
      const email = getStoredToken() ? getStoredEmail() : null;
      setUser(email ? { email } : null);
      setLoading(false);
      return;
    }
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
      if (tempAuth) {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          throw new Error('Invalid email or password');
        }
        const { token } = await res.json();
        setStoredSession(token, email);
        setUser({ email });
        return;
      }
      await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    },
    signOut: async () => {
      if (tempAuth) {
        clearStoredSession();
        setUser(null);
        return;
      }
      await firebaseSignOut(getFirebaseAuth());
    },
    getIdToken: async () => {
      if (tempAuth) {
        return getStoredToken();
      }
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
