# Authentication

1. User signs in with Firebase.
2. Frontend receives Firebase ID token.
3. Token is sent as Bearer token to backend.
4. NestJS verifies token with Firebase Admin SDK.
5. Backend resolves application user and company membership.
6. Server-side guards authorize the operation.

No application password storage.
