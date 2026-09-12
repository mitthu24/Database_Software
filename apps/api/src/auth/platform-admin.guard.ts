import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PlatformAdminsService } from '../platform-admins/platform-admins.service';
import type { RequestWithAppIdentity } from './resolve-app-identity.guard';

/**
 * Must run after FirebaseAuthGuard + ResolveAppIdentityGuard. Checks
 * `platform_admins` ONLY (never `company_memberships`) — see
 * ADR-006-SUPER-ADMIN-MODEL.md. Use on every Super Admin route:
 *   @UseGuards(FirebaseAuthGuard, ResolveAppIdentityGuard, PlatformAdminGuard)
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly platformAdminsService: PlatformAdminsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAppIdentity>();
    const identity = request.appIdentity;

    if (!identity) {
      throw new ForbiddenException('Missing resolved identity');
    }

    const isAdmin = await this.platformAdminsService.isPlatformAdmin(identity.userId);
    if (!isAdmin) {
      throw new ForbiddenException('Super Admin access required');
    }

    return true;
  }
}
