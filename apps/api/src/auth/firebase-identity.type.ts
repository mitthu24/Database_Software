/**
 * What we attach to `request.firebaseUser` after successful token
 * verification. This is IDENTITY only (who the caller is per Firebase) —
 * it is NOT yet the application user or company role. Resolving
 * firebaseUid -> application user -> company membership/role happens in
 * Phase 3 once the control-plane database is wired up. Do not treat
 * possession of a valid Firebase token as authorization by itself.
 */
export interface FirebaseIdentity {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}
