import { Controller, Get, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { ResolveAppIdentityGuard } from './resolve-app-identity.guard';
import { CurrentAppIdentity } from './current-app-identity.decorator';
import { AppIdentity } from './app-identity.type';

@Controller('auth')
export class AuthController {
  /**
   * Proves the full Phase 2 + Phase 3 pipeline end to end: verifies the
   * Firebase token, then resolves/provisions the application user and
   * their company memberships. Returns the caller's own identity + roles
   * — not general-purpose user lookup.
   */
  @UseGuards(FirebaseAuthGuard, ResolveAppIdentityGuard)
  @Get('me')
  me(@CurrentAppIdentity() identity: AppIdentity) {
    return { identity };
  }
}
