import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { ResolveAppIdentityGuard } from '../auth/resolve-app-identity.guard';
import { CompanyRolesGuard, RequireCompanyRole } from '../auth/company-roles.guard';
import { CurrentAppIdentity } from '../auth/current-app-identity.decorator';
import type { AppIdentity } from '../auth/app-identity.type';
import { WorkspacesService } from '../workspaces/workspaces.service';
import {
  CreateTableColumnInput,
  SchemaManagementService,
  UpdateColumnInput,
} from './schema-management.service';

/**
 * Company-scoped (never Super-Admin-only): any active COMPANY_ADMIN or
 * COMPANY_USER member may manage their own company's table structures, per
 * docs/product/PRD.md ("an authorized company user to create and manage
 * PostgreSQL table structures"). `:companyId` is only ever used to look up
 * the caller's already-resolved membership via `CompanyRolesGuard` — never
 * trusted as proof of access by itself (AGENTS.md rule 5). The tenant
 * schema name is resolved server-side from `WorkspacesService`, never
 * accepted from the client.
 */
@UseGuards(FirebaseAuthGuard, ResolveAppIdentityGuard, CompanyRolesGuard)
@RequireCompanyRole('COMPANY_ADMIN', 'COMPANY_USER')
@Controller('companies/:companyId/workspace')
export class SchemaManagementController {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly schemaManagementService: SchemaManagementService,
  ) {}

  private async resolveSchemaName(actorUserId: string, companyId: string): Promise<{
    workspaceId: string;
    schemaName: string;
  }> {
    const workspace = await this.workspacesService.getOrCreateForCompany(actorUserId, companyId);
    return { workspaceId: workspace.id, schemaName: workspace.schemaName };
  }

  @Get()
  async getWorkspace(@CurrentAppIdentity() identity: AppIdentity, @Param('companyId') companyId: string) {
    const workspace = await this.workspacesService.getOrCreateForCompany(identity.userId, companyId);
    return { id: workspace.id, schemaName: workspace.schemaName, status: workspace.status };
  }

  @Get('tables')
  async listTables(@CurrentAppIdentity() identity: AppIdentity, @Param('companyId') companyId: string) {
    const { schemaName } = await this.resolveSchemaName(identity.userId, companyId);
    return this.schemaManagementService.listTables(schemaName);
  }

  @Post('tables')
  async createTable(
    @CurrentAppIdentity() identity: AppIdentity,
    @Param('companyId') companyId: string,
    @Body('name') name: string,
    @Body('columns') columns: CreateTableColumnInput[],
  ) {
    const { workspaceId, schemaName } = await this.resolveSchemaName(identity.userId, companyId);
    if (!Array.isArray(columns)) {
      throw new BadRequestException('columns must be an array');
    }
    return this.schemaManagementService.createTable(
      identity.userId,
      companyId,
      workspaceId,
      schemaName,
      name ?? '',
      columns,
    );
  }

  @Get('tables/:tableName')
  async getTable(
    @CurrentAppIdentity() identity: AppIdentity,
    @Param('companyId') companyId: string,
    @Param('tableName') tableName: string,
  ) {
    const { workspaceId, schemaName } = await this.resolveSchemaName(identity.userId, companyId);
    return this.schemaManagementService.getTable(workspaceId, schemaName, tableName);
  }

  @Patch('tables/:tableName')
  async renameTable(
    @CurrentAppIdentity() identity: AppIdentity,
    @Param('companyId') companyId: string,
    @Param('tableName') tableName: string,
    @Body('name') name: string,
  ) {
    const { workspaceId, schemaName } = await this.resolveSchemaName(identity.userId, companyId);
    return this.schemaManagementService.renameTable(
      identity.userId,
      companyId,
      workspaceId,
      schemaName,
      tableName,
      name ?? '',
    );
  }

  @Delete('tables/:tableName')
  async deleteTable(
    @CurrentAppIdentity() identity: AppIdentity,
    @Param('companyId') companyId: string,
    @Param('tableName') tableName: string,
    @Body('confirm') confirm: boolean,
  ) {
    const { workspaceId, schemaName } = await this.resolveSchemaName(identity.userId, companyId);
    await this.schemaManagementService.deleteTable(
      identity.userId,
      companyId,
      workspaceId,
      schemaName,
      tableName,
      confirm === true,
    );
    return { deleted: true };
  }

  @Post('tables/:tableName/columns')
  async addColumn(
    @CurrentAppIdentity() identity: AppIdentity,
    @Param('companyId') companyId: string,
    @Param('tableName') tableName: string,
    @Body() body: CreateTableColumnInput,
  ) {
    const { workspaceId, schemaName } = await this.resolveSchemaName(identity.userId, companyId);
    return this.schemaManagementService.addColumn(
      identity.userId,
      companyId,
      workspaceId,
      schemaName,
      tableName,
      body,
    );
  }

  @Post('tables/:tableName/columns/reorder')
  async reorderColumns(
    @CurrentAppIdentity() identity: AppIdentity,
    @Param('companyId') companyId: string,
    @Param('tableName') tableName: string,
    @Body('order') order: string[],
  ) {
    const { workspaceId, schemaName } = await this.resolveSchemaName(identity.userId, companyId);
    if (!Array.isArray(order)) {
      throw new BadRequestException('order must be an array');
    }
    await this.schemaManagementService.reorderColumns(
      identity.userId,
      companyId,
      workspaceId,
      schemaName,
      tableName,
      order,
    );
    return { reordered: true };
  }

  @Patch('tables/:tableName/columns/:columnName')
  async updateColumn(
    @CurrentAppIdentity() identity: AppIdentity,
    @Param('companyId') companyId: string,
    @Param('tableName') tableName: string,
    @Param('columnName') columnName: string,
    @Body() body: UpdateColumnInput,
  ) {
    const { workspaceId, schemaName } = await this.resolveSchemaName(identity.userId, companyId);
    return this.schemaManagementService.updateColumn(
      identity.userId,
      companyId,
      workspaceId,
      schemaName,
      tableName,
      columnName,
      body,
    );
  }

  @Delete('tables/:tableName/columns/:columnName')
  async deleteColumn(
    @CurrentAppIdentity() identity: AppIdentity,
    @Param('companyId') companyId: string,
    @Param('tableName') tableName: string,
    @Param('columnName') columnName: string,
    @Body('confirm') confirm: boolean,
  ) {
    const { workspaceId, schemaName } = await this.resolveSchemaName(identity.userId, companyId);
    await this.schemaManagementService.deleteColumn(
      identity.userId,
      companyId,
      workspaceId,
      schemaName,
      tableName,
      columnName,
      confirm === true,
    );
    return { deleted: true };
  }
}
