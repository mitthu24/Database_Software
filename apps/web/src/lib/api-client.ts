import { getFirebaseAuth } from './firebase/client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

/**
 * Wraps fetch() to attach the current user's Firebase ID token as a Bearer
 * token, matching docs/flows/AUTH-FLOW.md. Throws if there is no signed-in
 * user — callers should only use this from authenticated screens.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const currentUser = getFirebaseAuth().currentUser;
  if (!currentUser) {
    throw new Error('No signed-in user — cannot call the API');
  }

  const token = await currentUser.getIdToken();

  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}
