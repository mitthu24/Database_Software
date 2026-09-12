import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { ResolveAppIdentityGuard } from '../auth/resolve-app-identity.guard';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { CurrentAppIdentity } from '../auth/current-app-identity.decorator';
import type { AppIdentity } from '../auth/app-identity.type';
import { CompanyAdminsService } from './company-admins.service';

@UseGuards(FirebaseAuthGuard, ResolveAppIdentityGuard, PlatformAdminGuard)
@Controller('companies/:companyId/admins')
export class CompanyAdminsController {
  constructor(private readonly companyAdminsService: CompanyAdminsService) {}

  @Get()
  list(@Param('companyId') companyId: string) {
    return this.companyAdminsService.listForCompany(companyId);
  }

  @Post()
  invite(
    @CurrentAppIdentity() identity: AppIdentity,
    @Param('companyId') companyId: string,
    @Body('email') email: string,
  ) {
    return this.companyAdminsService.invite(identity.userId, companyId, email ?? '');
  }
}
