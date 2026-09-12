import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { MembershipsService } from '../memberships/memberships.service';
import { PlatformAdminsService } from '../platform-admins/platform-admins.service';
import type { RequestWithFirebaseUser } from './firebase-auth.guard';
import type { AppIdentity } from './app-identity.type';

export interface RequestWithAppIdentity extends RequestWithFirebaseUser {
  appIdentity?: AppIdentity;
}

/**
 * Must run AFTER FirebaseAuthGuard (e.g. `@UseGuards(FirebaseAuthGuard,
 * ResolveAppIdentityGuard)`). Turns "this is a verified Firebase user" into
 * "this is application user X with these company memberships (and whether
 * they're a Super Admin)" by JIT-provisioning/looking up the `users` row
 * and reading `company_memberships` + `platform_admins`. Attaches the
 * result to `request.appIdentity`.
 *
 * This guard grants no access by itself — a freshly provisioned user has an
 * empty memberships array and isPlatformAdmin=false, so every scoped route
 * must still check `hasCompanyRole(...)` or use `PlatformAdminGuard` before
 * allowing anything.
 */
@Injectable()
export class ResolveAppIdentityGuard implements CanActivate {
  constructor(
    private readonly usersService: UsersService,
    private readonly membershipsService: MembershipsService,
    private readonly platformAdminsService: PlatformAdminsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAppIdentity>();
    const firebaseUser = request.firebaseUser;

    if (!firebaseUser) {
      // Misconfiguration, not a client error: this guard was used without
      // FirebaseAuthGuard running first.
      throw new UnauthorizedException('Firebase identity not resolved');
    }

    const appUser = await this.usersService.findOrCreateByFirebaseUid(
      firebaseUser.uid,
      firebaseUser.email ?? '',
    );
    const [memberships, isPlatformAdmin] = await Promise.all([
      this.membershipsService.getMembershipsForUser(appUser.id),
      this.platformAdminsService.isPlatformAdmin(appUser.id),
    ]);

    request.appIdentity = {
      userId: appUser.id,
      email: appUser.email,
      status: appUser.status,
      memberships,
      isPlatformAdmin,
    };

    return true;
  }
}
