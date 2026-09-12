import { Module } from '@nestjs/common';
import { SchemaManagementService } from './schema-management.service';
import { SchemaManagementController } from './schema-management.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [AuthModule, AuditModule, WorkspacesModule],
  controllers: [SchemaManagementController],
  providers: [SchemaManagementService],
  exports: [SchemaManagementService],
})
export class SchemaManagementModule {}
