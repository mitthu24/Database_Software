import { initializeApp, getApps, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let cachedAuth: Auth | null = null;

/** True once every required NEXT_PUBLIC_FIREBASE_* value is present (not just non-empty at build time — Vercel/CI can ship a build with none of them set, per docs/HANDOFF.md's "no live Firebase project yet"). */
export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId,
  );
}

/**
 * Lazily initializes Firebase Auth on first call, IN THE BROWSER ONLY.
 *
 * Next.js's App Router prerenders "use client" pages on the server/at
 * build time too. The Firebase client SDK is not meant to run there, and
 * will throw (e.g. auth/invalid-api-key) if initialized eagerly at module
 * load with missing/placeholder env vars — which breaks `next build`
 * entirely. Every caller must therefore call `getFirebaseAuth()` from
 * inside an effect/event handler, never at module top level.
 *
 * Callers should check `isFirebaseConfigured()` first — this still throws
 * if config is missing, so the app can show a real message instead of
 * Next.js's generic "Application error" page.
 */
export function getFirebaseAuth(): Auth {
  if (typeof window === 'undefined') {
    throw new Error('getFirebaseAuth() must only be called in the browser, not during SSR/build');
  }
  if (!cachedAuth) {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    cachedAuth = getAuth(app);
  }
  return cachedAuth;
}
