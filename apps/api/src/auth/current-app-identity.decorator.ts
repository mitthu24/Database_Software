import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestWithAppIdentity } from './resolve-app-identity.guard';

/**
 * Use inside a route guarded by both FirebaseAuthGuard and
 * ResolveAppIdentityGuard, e.g.:
 *   @UseGuards(FirebaseAuthGuard, ResolveAppIdentityGuard)
 *   @Get('me')
 *   me(@CurrentAppIdentity() identity: AppIdentity) { ... }
 */
export const CurrentAppIdentity = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithAppIdentity>();
    return request.appIdentity;
  },
);
