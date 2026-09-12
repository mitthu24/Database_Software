import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { ResolveAppIdentityGuard } from '../auth/resolve-app-identity.guard';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { AuditService } from './audit.service';

@UseGuards(FirebaseAuthGuard, ResolveAppIdentityGuard, PlatformAdminGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(@Query('companyId') companyId?: string, @Query('limit') limit?: string) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    return this.auditService.listRecent({ companyId, limit: parsedLimit });
  }
}
