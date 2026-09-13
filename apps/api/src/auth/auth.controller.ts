import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { ResolveAppIdentityGuard } from './resolve-app-identity.guard';
import { TempAuthService } from './temp-auth.service';
import { CurrentAppIdentity } from './current-app-identity.decorator';
import { AppIdentity } from './app-identity.type';

@Controller('auth')
export class AuthController {
  constructor(private readonly tempAuthService: TempAuthService) {}

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

  /**
   * TEMPORARY (see docs/HANDOFF.md "temporary email/password auth") — the
   * unauthenticated entry point for the email/password stand-in. 404s
   * unless `TEMP_AUTH_ENABLED=true`. Delete this route when Firebase is
   * set up; there is no equivalent needed for real Firebase auth (the
   * frontend talks to Firebase directly for sign-in).
   */
  @Post('login')
  login(@Body('email') email: string, @Body('password') password: string) {
    return this.tempAuthService.login(email ?? '', password ?? '');
  }
}
