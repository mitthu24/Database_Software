import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestWithFirebaseUser } from './firebase-auth.guard';

/**
 * Use inside a route guarded by FirebaseAuthGuard, e.g.:
 *   @UseGuards(FirebaseAuthGuard)
 *   @Get('me')
 *   me(@CurrentFirebaseUser() user: FirebaseIdentity) { ... }
 */
export const CurrentFirebaseUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithFirebaseUser>();
    return request.firebaseUser;
  },
);
