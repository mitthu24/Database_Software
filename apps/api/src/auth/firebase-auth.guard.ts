import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { FirebaseAdminService } from './firebase-admin.provider';
import { FirebaseIdentity } from './firebase-identity.type';

export interface RequestWithFirebaseUser extends Request {
  firebaseUser?: FirebaseIdentity;
}

/**
 * Verifies the `Authorization: Bearer <Firebase ID token>` header on every
 * route it guards. On success, attaches a minimal `FirebaseIdentity` to
 * `request.firebaseUser`. Per AGENTS.md rule 5, this guard establishes WHO
 * the caller is — it does not by itself authorize any action. Route
 * handlers/services must still resolve company membership and role before
 * allowing anything company- or tenant-scoped (Phase 3+).
 */
@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithFirebaseUser>();
    const token = this.extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const decoded = await this.firebaseAdmin.getApp().auth().verifyIdToken(token);
      request.firebaseUser = {
        uid: decoded.uid,
        email: decoded.email ?? null,
        emailVerified: decoded.email_verified ?? false,
      };
      return true;
    } catch {
      // Never leak verification internals (expired vs malformed vs revoked).
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractBearerToken(header?: string): string | null {
    if (!header) return null;
    const [scheme, value] = header.split(' ');
    if (scheme !== 'Bearer' || !value) return null;
    return value;
  }
}
