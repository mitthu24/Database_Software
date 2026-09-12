import { Module } from '@nestjs/common';
import { CompanyAdminsService } from './company-admins.service';
import { CompanyAdminsController } from './company-admins.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { CompaniesModule } from '../companies/companies.module';
import { AuditModule } from '../audit/audit.module';
import { BrevoModule } from '../brevo/brevo.module';

@Module({
  imports: [AuthModule, UsersModule, CompaniesModule, AuditModule, BrevoModule],
  controllers: [CompanyAdminsController],
  providers: [CompanyAdminsService],
  exports: [CompanyAdminsService],
})
export class CompanyAdminsModule {}
