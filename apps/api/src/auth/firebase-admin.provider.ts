import { Provider } from '@nestjs/common';
import * as admin from 'firebase-admin';

export const FIREBASE_ADMIN = 'FIREBASE_ADMIN';

/**
 * Initializes a single Firebase Admin app instance from environment
 * variables. Required env vars (see apps/api/.env.example):
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY  (escaped newlines — see note below)
 *
 * Private keys copied from a Firebase service-account JSON file contain
 * literal "\n" sequences; when stored in a single-line .env value they must
 * be un-escaped back into real newlines, which is what the replace() below
 * does.
 */
export const firebaseAdminProvider: Provider = {
  provide: FIREBASE_ADMIN,
  useFactory: (): admin.app.App => {
    if (admin.apps.length > 0) {
      return admin.app();
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'Missing Firebase Admin credentials. Set FIREBASE_PROJECT_ID, ' +
          'FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in apps/api/.env',
      );
    }

    return admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  },
};
