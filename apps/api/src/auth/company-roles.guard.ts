import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasCompanyRole, CompanyRole } from '../memberships/memberships.service';
import type { RequestWithAppIdentity } from './resolve-app-identity.guard';

export const COMPANY_ROLES_KEY = 'companyRoles';

/** Decorator for future company-scoped controllers, e.g.:
 *   @RequireCompanyRole('COMPANY_ADMIN')
 *   @UseGuards(FirebaseAuthGuard, ResolveAppIdentityGuard, CompanyRolesGuard)
 *   @Patch(':companyId/...')
 */
export const RequireCompanyRole = (...roles: CompanyRole[]) =>
  SetMetadata(COMPANY_ROLES_KEY, roles);

/**
 * Must run after FirebaseAuthGuard + ResolveAppIdentityGuard. Reads
 * `:companyId` from the route params and checks it against the caller's
 * resolved memberships (from the database) — the companyId in the URL is
 * only ever used to look up an EXISTING membership row, never trusted as
 * proof of access by itself (see AGENTS.md rule 5).
 *
 * Not yet wired to any controller — added in Phase 3 as the authorization
 * primitive Phase 4's company/admin endpoints will use.
 */
@Injectable()
export class CompanyRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedRoles = this.reflector.get<CompanyRole[]>(
      COMPANY_ROLES_KEY,
      context.getHandler(),
    );
    if (!allowedRoles || allowedRoles.length === 0) {
      // No @RequireCompanyRole on this route — nothing for this guard to check.
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithAppIdentity>();
    const companyId = request.params?.companyId;
    const identity = request.appIdentity;

    if (!companyId || !identity) {
      throw new ForbiddenException('Missing company context');
    }

    if (!hasCompanyRole(identity.memberships, companyId, allowedRoles)) {
      throw new ForbiddenException('You do not have access to this company');
    }

    return true;
  }
}
