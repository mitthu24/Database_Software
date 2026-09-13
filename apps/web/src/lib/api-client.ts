import { getFirebaseAuth } from './firebase/client';
import { isTempAuthEnabled, getStoredToken } from './temp-auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

/**
 * TEMPORARY branch (see docs/HANDOFF.md "temporary email/password auth"):
 * when NEXT_PUBLIC_TEMP_AUTH_ENABLED=true, the bearer token comes from
 * localStorage (set by temp-auth's login flow) instead of Firebase. Delete
 * this branch and the temp-auth import when Firebase is set up.
 */
async function getAuthToken(): Promise<string | null> {
  if (isTempAuthEnabled()) {
    return getStoredToken();
  }
  const currentUser = getFirebaseAuth().currentUser;
  if (!currentUser) return null;
  return currentUser.getIdToken();
}

/**
 * Wraps fetch() to attach the current user's auth token as a Bearer token,
 * matching docs/flows/AUTH-FLOW.md. Throws if there is no signed-in user —
 * callers should only use this from authenticated screens.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('No signed-in user — cannot call the API');
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}
