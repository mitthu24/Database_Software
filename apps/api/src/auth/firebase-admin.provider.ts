import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';

/**
 * Lazily initializes Firebase Admin on first actual use, not at app
 * bootstrap. Required env vars (see apps/api/.env.example):
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY  (escaped newlines — see note below)
 *
 * Private keys copied from a Firebase service-account JSON file contain
 * literal "\n" sequences; when stored in a single-line .env value they must
 * be un-escaped back into real newlines, which is what the replace() below
 * does.
 *
 * This used to be a NestJS provider whose factory called
 * `admin.initializeApp(...)` eagerly — since `FirebaseAuthGuard` injects it
 * via the constructor, Nest resolves (and therefore runs) that factory
 * during `NestFactory.create(AppModule)`, i.e. before `app.listen()`. With
 * no live Firebase project configured yet (see docs/HANDOFF.md), that threw
 * and crashed the ENTIRE process before `/health` was even reachable —
 * the same class of bug fixed for the web app's client-side Firebase init.
 * Making this a lazy getter means the app boots and `/health` responds
 * even without Firebase credentials; only requests that actually need
 * token verification fail, with a clear error.
 */
@Injectable()
export class FirebaseAdminService {
  private app: admin.app.App | null = null;

  getApp(): admin.app.App {
    if (admin.apps.length > 0) {
      this.app = admin.app();
    }
    if (this.app) {
      return this.app;
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

    this.app = admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
    return this.app;
  }
}
