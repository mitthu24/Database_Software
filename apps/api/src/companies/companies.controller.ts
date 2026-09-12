import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { ResolveAppIdentityGuard } from '../auth/resolve-app-identity.guard';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { CurrentAppIdentity } from '../auth/current-app-identity.decorator';
import type { AppIdentity } from '../auth/app-identity.type';
import { CompaniesService } from './companies.service';

@UseGuards(FirebaseAuthGuard, ResolveAppIdentityGuard, PlatformAdminGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  create(@CurrentAppIdentity() identity: AppIdentity, @Body('name') name: string) {
    return this.companiesService.create(identity.userId, name ?? '');
  }

  @Get()
  list() {
    return this.companiesService.list();
  }

  @Get(':companyId')
  get(@Param('companyId') companyId: string) {
    return this.companiesService.getOrThrow(companyId);
  }

  @Patch(':companyId')
  rename(
    @CurrentAppIdentity() identity: AppIdentity,
    @Param('companyId') companyId: string,
    @Body('name') name: string,
  ) {
    return this.companiesService.rename(identity.userId, companyId, name ?? '');
  }

  @Post(':companyId/activate')
  activate(@CurrentAppIdentity() identity: AppIdentity, @Param('companyId') companyId: string) {
    return this.companiesService.setStatus(identity.userId, companyId, 'active');
  }

  @Post(':companyId/suspend')
  suspend(@CurrentAppIdentity() identity: AppIdentity, @Param('companyId') companyId: string) {
    return this.companiesService.setStatus(identity.userId, companyId, 'suspended');
  }
}
