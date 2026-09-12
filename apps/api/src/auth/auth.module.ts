import { Global, Module } from '@nestjs/common';
import { FirebaseAdminModule } from './firebase-admin.module';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { ResolveAppIdentityGuard } from './resolve-app-identity.guard';
import { CompanyRolesGuard } from './company-roles.guard';
import { PlatformAdminGuard } from './platform-admin.guard';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { PlatformAdminsModule } from '../platform-admins/platform-admins.module';

// @Global(): these guards are used by nearly every feature module
// (companies, company-admins, audit, and future modules). Making the
// module global avoids every consumer having to re-import it just to use
// a guard class in @UseGuards(...). We also re-export the sub-modules the
// guards themselves depend on (Users/Memberships/PlatformAdmins) — Nest
// resolves a guard class's own constructor dependencies using the
// *consuming* module's visible providers, not just the guard's home
// module, so those must be visible wherever @UseGuards(...) is used.
@Global()
@Module({
  imports: [FirebaseAdminModule, UsersModule, MembershipsModule, PlatformAdminsModule],
  controllers: [AuthController],
  providers: [FirebaseAuthGuard, ResolveAppIdentityGuard, CompanyRolesGuard, PlatformAdminGuard],
  exports: [
    FirebaseAdminModule,
    UsersModule,
    MembershipsModule,
    PlatformAdminsModule,
    FirebaseAuthGuard,
    ResolveAppIdentityGuard,
    CompanyRolesGuard,
    PlatformAdminGuard,
  ],
})
export class AuthModule {}
