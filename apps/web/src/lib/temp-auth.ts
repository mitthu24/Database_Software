/**
 * TEMPORARY email/password auth client helpers — see docs/HANDOFF.md
 * "temporary email/password auth". Only active when
 * NEXT_PUBLIC_TEMP_AUTH_ENABLED=true (i.e. no live Firebase project exists
 * yet). Delete this file, its usages in api-client.ts/auth-context.tsx, and
 * the env var when Firebase is set up.
 */

const TOKEN_KEY = 'temp_auth_token';
const EMAIL_KEY = 'temp_auth_email';

export function isTempAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_TEMP_AUTH_ENABLED === 'true';
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredEmail(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(EMAIL_KEY);
  } catch {
    return null;
  }
}

export function setStoredSession(token: string, email: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(EMAIL_KEY, email);
  } catch {
    // Best-effort only (e.g. private browsing) — the demo login just won't persist across reloads.
  }
}

export function clearStoredSession(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(EMAIL_KEY);
  } catch {
    // ignore
  }
}
