import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { UsersService } from '../users/users.service';

export interface TempAuthTokenPayload {
  uid: string;
  email: string;
}

/**
 * TEMPORARY email/password auth — see docs/HANDOFF.md "temporary
 * email/password auth" for full context and removal steps. This exists
 * only because no live Firebase project has been created yet; it stores a
 * bcrypt password hash in `users.password_hash`, directly contradicting
 * AGENTS.md rule 4 ("Firebase handles identity. Never store passwords in
 * PostgreSQL.") and ADR-004-FIREBASE-AUTH.md — an intentional, explicitly
 * user-approved, temporary exception.
 *
 * Every method is a no-op (throws) unless `TEMP_AUTH_ENABLED=true` is set,
 * so this is inert everywhere else, including in any environment where a
 * real Firebase project is later configured.
 */
@Injectable()
export class TempAuthService {
  constructor(private readonly usersService: UsersService) {}

  isEnabled(): boolean {
    return process.env.TEMP_AUTH_ENABLED === 'true';
  }

  private getSecret(): string {
    const secret = process.env.TEMP_AUTH_JWT_SECRET;
    if (!secret) {
      throw new Error('TEMP_AUTH_ENABLED is true but TEMP_AUTH_JWT_SECRET is not set');
    }
    return secret;
  }

  async login(email: string, password: string): Promise<{ token: string }> {
    if (!this.isEnabled()) {
      throw new NotFoundException();
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: TempAuthTokenPayload = { uid: user.firebaseUid, email: user.email };
    const token = jwt.sign(payload, this.getSecret(), { expiresIn: '30d' });
    return { token };
  }

  verifyToken(token: string): TempAuthTokenPayload {
    if (!this.isEnabled()) {
      throw new UnauthorizedException();
    }
    try {
      return jwt.verify(token, this.getSecret()) as TempAuthTokenPayload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
