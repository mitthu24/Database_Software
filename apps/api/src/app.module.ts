import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { DbModule } from './db/db.module';
import { UsersModule } from './users/users.module';
import { MembershipsModule } from './memberships/memberships.module';
import { AuditModule } from './audit/audit.module';
import { PlatformAdminsModule } from './platform-admins/platform-admins.module';
import { CompaniesModule } from './companies/companies.module';
import { CompanyAdminsModule } from './company-admins/company-admins.module';
import { BrevoModule } from './brevo/brevo.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { SchemaManagementModule } from './schema-management/schema-management.module';

// Phase 5: company workspace provisioning + dynamic table/column DDL
// (WorkspacesModule, SchemaManagementModule). See docs/PROJECT-STATUS.md.
@Module({
  imports: [
    DbModule,
    UsersModule,
    MembershipsModule,
    AuditModule,
    PlatformAdminsModule,
    BrevoModule,
    AuthModule,
    CompaniesModule,
    CompanyAdminsModule,
    WorkspacesModule,
    SchemaManagementModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
