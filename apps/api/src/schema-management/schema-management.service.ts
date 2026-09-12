import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { DRIZZLE_DB, Database } from '../db/db.provider';
import { tenantColumnDisplay } from '../db/schema/control-plane.schema';
import { AuditService } from '../audit/audit.service';
import {
  assertSafeIdentifier,
  normalizeToIdentifier,
  quoteIdentifier,
  UnsafeIdentifierError,
} from '../common/sql-identifier.util';
import { friendlyColumnType, resolvePostgresType, SupportedColumnType } from './column-types';

// Implicit columns every table gets at creation time (sane defaults for a
// "database software" product). Never renameable/droppable/retypeable
// through this service — they are not part of the user-managed column set.
const SYSTEM_COLUMNS = new Set(['id', 'created_at', 'updated_at']);

export interface CreateTableColumnInput {
  name: string;
  type: string;
  nullable?: boolean;
  unique?: boolean;
}

export interface UpdateColumnInput {
  name?: string;
  type?: string;
  nullable?: boolean;
  unique?: boolean;
}

export interface TableSummary {
  name: string;
}

export interface ColumnSummary {
  name: string;
  type: SupportedColumnType | null;
  nullable: boolean;
  unique: boolean;
  isSystemColumn: boolean;
  displayOrder: number;
}

function normalizeName(raw: string, label: string): string {
  const normalized = normalizeToIdentifier(raw ?? '');
  if (!normalized) {
    throw new BadRequestException(`${label} must contain at least one letter or number`);
  }
  try {
    assertSafeIdentifier(normalized);
  } catch (err) {
    if (err instanceof UnsafeIdentifierError) {
      throw new BadRequestException(`${label} "${raw}" is not a valid identifier`);
    }
    throw err;
  }
  return normalized;
}

function qualified(schemaName: string, tableName: string): string {
  return `${quoteIdentifier(schemaName)}.${quoteIdentifier(tableName)}`;
}

function uniqueConstraintName(tableName: string, columnName: string): string {
  // Deterministic and derived only from already-validated identifiers.
  return `${tableName}_${columnName}_key`;
}

/**
 * The only code path allowed to issue dynamic DDL against a tenant schema
 * (docs/database/DYNAMIC-TABLES.md). Every identifier that reaches a DDL
 * string first goes through `normalizeName`/`assertSafeIdentifier` and is
 * rendered with `quoteIdentifier`; schema+table are always fully-qualified
 * in one statement. All comparisons against `information_schema` use
 * ordinary parameterized values (not identifiers). Destructive operations
 * require an explicit `confirm: true` from the caller. Every call — success
 * or failure — is audited.
 */
@Injectable()
export class SchemaManagementService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: Database,
    private readonly auditService: AuditService,
  ) {}

  private async audit(
    actorUserId: string,
    companyId: string,
    action: string,
    resourceType: string,
    resourceId: string | null,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.auditService.record({ actorUserId, companyId, action, resourceType, resourceId, metadata });
  }

  private async tableExists(schemaName: string, tableName: string): Promise<boolean> {
    const result = await this.db.execute(sql`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = ${schemaName} AND table_name = ${tableName}
      LIMIT 1
    `);
    return result.rows.length > 0;
  }

  private async assertTableExists(schemaName: string, tableName: string): Promise<void> {
    if (!(await this.tableExists(schemaName, tableName))) {
      throw new NotFoundException(`Table "${tableName}" not found`);
    }
  }

  private async rawColumns(schemaName: string, tableName: string) {
    const result = await this.db.execute<{
      column_name: string;
      udt_name: string;
      is_nullable: string;
      ordinal_position: number;
    }>(sql`
      SELECT column_name, udt_name, is_nullable, ordinal_position
      FROM information_schema.columns
      WHERE table_schema = ${schemaName} AND table_name = ${tableName}
      ORDER BY ordinal_position ASC
    `);
    return result.rows;
  }

  private async uniqueColumnNames(schemaName: string, tableName: string): Promise<Set<string>> {
    const result = await this.db.execute<{ column_name: string }>(sql`
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = ${schemaName}
        AND tc.table_name = ${tableName}
        AND tc.constraint_type = 'UNIQUE'
    `);
    return new Set(result.rows.map((r) => r.column_name));
  }

  async listTables(schemaName: string): Promise<TableSummary[]> {
    const result = await this.db.execute<{ table_name: string }>(sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = ${schemaName} AND table_type = 'BASE TABLE'
      ORDER BY table_name ASC
    `);
    return result.rows.map((r) => ({ name: r.table_name }));
  }

  async getTable(
    workspaceId: string,
    schemaName: string,
    tableName: string,
  ): Promise<{ name: string; columns: ColumnSummary[] }> {
    await this.assertTableExists(schemaName, tableName);

    const [rawCols, uniqueCols, displayRows] = await Promise.all([
      this.rawColumns(schemaName, tableName),
      this.uniqueColumnNames(schemaName, tableName),
      this.db
        .select()
        .from(tenantColumnDisplay)
        .where(
          and(eq(tenantColumnDisplay.workspaceId, workspaceId), eq(tenantColumnDisplay.tableName, tableName)),
        ),
    ]);

    const displayOrderByName = new Map(displayRows.map((r) => [r.columnName, r.displayOrder]));

    const columns: ColumnSummary[] = rawCols.map((col) => {
      const isSystemColumn = SYSTEM_COLUMNS.has(col.column_name);
      return {
        name: col.column_name,
        type: friendlyColumnType(col.udt_name),
        nullable: col.is_nullable === 'YES',
        unique: uniqueCols.has(col.column_name),
        isSystemColumn,
        displayOrder: isSystemColumn
          ? col.ordinal_position
          : displayOrderByName.get(col.column_name) ?? col.ordinal_position,
      };
    });

    columns.sort((a, b) => {
      if (a.isSystemColumn !== b.isSystemColumn) return a.isSystemColumn ? -1 : 1;
      return a.displayOrder - b.displayOrder;
    });

    return { name: tableName, columns };
  }

  async createTable(
    actorUserId: string,
    companyId: string,
    workspaceId: string,
    schemaName: string,
    name: string,
    columns: CreateTableColumnInput[],
  ): Promise<{ name: string }> {
    const tableName = normalizeName(name, 'Table name');

    if (!columns || columns.length === 0) {
      throw new BadRequestException('A table needs at least one column');
    }

    const normalizedColumns = columns.map((c) => ({
      name: normalizeName(c.name, 'Column name'),
      pgType: resolvePostgresType(c.type),
      nullable: c.nullable ?? true,
      unique: c.unique ?? false,
    }));

    const seen = new Set<string>();
    for (const col of normalizedColumns) {
      if (SYSTEM_COLUMNS.has(col.name)) {
        throw new ConflictException(`Column name "${col.name}" is reserved`);
      }
      if (seen.has(col.name)) {
        throw new ConflictException(`Duplicate column name "${col.name}"`);
      }
      seen.add(col.name);
    }

    if (await this.tableExists(schemaName, tableName)) {
      throw new ConflictException(`Table "${tableName}" already exists`);
    }

    const columnDefs = normalizedColumns
      .map((col) => {
        const parts = [quoteIdentifier(col.name), col.pgType];
        if (!col.nullable) parts.push('NOT NULL');
        if (col.unique) parts.push('UNIQUE');
        return parts.join(' ');
      })
      .join(', ');

    const ddl = `CREATE TABLE ${qualified(schemaName, tableName)} (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      ${columnDefs},
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now()
    )`;

    try {
      await this.db.transaction(async (tx) => {
        await tx.execute(sql.raw(ddl));
        if (normalizedColumns.length > 0) {
          await tx.insert(tenantColumnDisplay).values(
            normalizedColumns.map((col, index) => ({
              workspaceId,
              tableName,
              columnName: col.name,
              displayOrder: index + 1,
            })),
          );
        }
      });
    } catch (err) {
      await this.audit(actorUserId, companyId, 'table.create.failed', 'table', null, { tableName });
      throw err;
    }

    await this.audit(actorUserId, companyId, 'table.created', 'table', tableName, {
      tableName,
      columns: normalizedColumns.map((c) => c.name),
    });

    return { name: tableName };
  }

  async renameTable(
    actorUserId: string,
    companyId: string,
    workspaceId: string,
    schemaName: string,
    tableName: string,
    newName: string,
  ): Promise<{ name: string }> {
    await this.assertTableExists(schemaName, tableName);
    const normalizedNewName = normalizeName(newName, 'Table name');

    if (normalizedNewName !== tableName && (await this.tableExists(schemaName, normalizedNewName))) {
      throw new ConflictException(`Table "${normalizedNewName}" already exists`);
    }

    await this.db.transaction(async (tx) => {
      await tx.execute(
        sql.raw(
          `ALTER TABLE ${qualified(schemaName, tableName)} RENAME TO ${quoteIdentifier(normalizedNewName)}`,
        ),
      );
      await tx
        .update(tenantColumnDisplay)
        .set({ tableName: normalizedNewName, updatedAt: new Date() })
        .where(
          and(eq(tenantColumnDisplay.workspaceId, workspaceId), eq(tenantColumnDisplay.tableName, tableName)),
        );
    });

    await this.audit(actorUserId, companyId, 'table.renamed', 'table', normalizedNewName, {
      from: tableName,
      to: normalizedNewName,
    });

    return { name: normalizedNewName };
  }

  async deleteTable(
    actorUserId: string,
    companyId: string,
    workspaceId: string,
    schemaName: string,
    tableName: string,
    confirm: boolean,
  ): Promise<void> {
    if (!confirm) {
      throw new BadRequestException('Deleting a table requires confirm: true');
    }
    await this.assertTableExists(schemaName, tableName);

    await this.db.transaction(async (tx) => {
      await tx.execute(sql.raw(`DROP TABLE ${qualified(schemaName, tableName)}`));
      await tx
        .delete(tenantColumnDisplay)
        .where(
          and(eq(tenantColumnDisplay.workspaceId, workspaceId), eq(tenantColumnDisplay.tableName, tableName)),
        );
    });

    await this.audit(actorUserId, companyId, 'table.deleted', 'table', tableName, { tableName });
  }

  async addColumn(
    actorUserId: string,
    companyId: string,
    workspaceId: string,
    schemaName: string,
    tableName: string,
    input: CreateTableColumnInput,
  ): Promise<ColumnSummary> {
    await this.assertTableExists(schemaName, tableName);
    const columnName = normalizeName(input.name, 'Column name');
    if (SYSTEM_COLUMNS.has(columnName)) {
      throw new ConflictException(`Column name "${columnName}" is reserved`);
    }
    const existingCols = await this.rawColumns(schemaName, tableName);
    if (existingCols.some((c) => c.column_name === columnName)) {
      throw new ConflictException(`Column "${columnName}" already exists`);
    }
    const pgType = resolvePostgresType(input.type);
    const nullable = input.nullable ?? true;
    const unique = input.unique ?? false;

    const parts = [quoteIdentifier(columnName), pgType];
    if (!nullable) parts.push('NOT NULL');
    if (unique) parts.push('UNIQUE');

    const userColumnCount = existingCols.filter((c) => !SYSTEM_COLUMNS.has(c.column_name)).length;

    await this.db.transaction(async (tx) => {
      await tx.execute(
        sql.raw(`ALTER TABLE ${qualified(schemaName, tableName)} ADD COLUMN ${parts.join(' ')}`),
      );
      await tx.insert(tenantColumnDisplay).values({
        workspaceId,
        tableName,
        columnName,
        displayOrder: userColumnCount + 1,
      });
    });

    await this.audit(actorUserId, companyId, 'column.added', 'column', columnName, {
      tableName,
      columnName,
      type: input.type,
    });

    return {
      name: columnName,
      type: input.type as SupportedColumnType,
      nullable,
      unique,
      isSystemColumn: false,
      displayOrder: userColumnCount + 1,
    };
  }

  async updateColumn(
    actorUserId: string,
    companyId: string,
    workspaceId: string,
    schemaName: string,
    tableName: string,
    columnName: string,
    input: UpdateColumnInput,
  ): Promise<{ name: string }> {
    await this.assertTableExists(schemaName, tableName);
    if (SYSTEM_COLUMNS.has(columnName)) {
      throw new ForbiddenException(`Column "${columnName}" cannot be modified`);
    }
    const existingCols = await this.rawColumns(schemaName, tableName);
    const existing = existingCols.find((c) => c.column_name === columnName);
    if (!existing) {
      throw new NotFoundException(`Column "${columnName}" not found`);
    }

    let finalName = columnName;

    await this.db.transaction(async (tx) => {
      if (input.type !== undefined) {
        const pgType = resolvePostgresType(input.type);
        await tx.execute(
          sql.raw(
            `ALTER TABLE ${qualified(schemaName, tableName)} ALTER COLUMN ${quoteIdentifier(columnName)} TYPE ${pgType} USING ${quoteIdentifier(columnName)}::${pgType}`,
          ),
        );
      }

      if (input.nullable !== undefined) {
        const clause = input.nullable ? 'DROP NOT NULL' : 'SET NOT NULL';
        await tx.execute(
          sql.raw(
            `ALTER TABLE ${qualified(schemaName, tableName)} ALTER COLUMN ${quoteIdentifier(columnName)} ${clause}`,
          ),
        );
      }

      if (input.unique !== undefined) {
        const constraintName = uniqueConstraintName(tableName, columnName);
        if (input.unique) {
          await tx.execute(
            sql.raw(
              `ALTER TABLE ${qualified(schemaName, tableName)} ADD CONSTRAINT ${quoteIdentifier(constraintName)} UNIQUE (${quoteIdentifier(columnName)})`,
            ),
          );
        } else {
          await tx.execute(
            sql.raw(
              `ALTER TABLE ${qualified(schemaName, tableName)} DROP CONSTRAINT IF EXISTS ${quoteIdentifier(constraintName)}`,
            ),
          );
        }
      }

      if (input.name !== undefined) {
        const normalizedNewName = normalizeName(input.name, 'Column name');
        if (normalizedNewName !== columnName) {
          if (SYSTEM_COLUMNS.has(normalizedNewName)) {
            throw new ConflictException(`Column name "${normalizedNewName}" is reserved`);
          }
          if (existingCols.some((c) => c.column_name === normalizedNewName)) {
            throw new ConflictException(`Column "${normalizedNewName}" already exists`);
          }
          await tx.execute(
            sql.raw(
              `ALTER TABLE ${qualified(schemaName, tableName)} RENAME COLUMN ${quoteIdentifier(columnName)} TO ${quoteIdentifier(normalizedNewName)}`,
            ),
          );
          await tx
            .update(tenantColumnDisplay)
            .set({ columnName: normalizedNewName, updatedAt: new Date() })
            .where(
              and(
                eq(tenantColumnDisplay.workspaceId, workspaceId),
                eq(tenantColumnDisplay.tableName, tableName),
                eq(tenantColumnDisplay.columnName, columnName),
              ),
            );
          finalName = normalizedNewName;
        }
      }
    });

    await this.audit(actorUserId, companyId, 'column.updated', 'column', finalName, {
      tableName,
      columnName,
      changes: input,
    });

    return { name: finalName };
  }

  async deleteColumn(
    actorUserId: string,
    companyId: string,
    workspaceId: string,
    schemaName: string,
    tableName: string,
    columnName: string,
    confirm: boolean,
  ): Promise<void> {
    if (!confirm) {
      throw new BadRequestException('Deleting a column requires confirm: true');
    }
    if (SYSTEM_COLUMNS.has(columnName)) {
      throw new ForbiddenException(`Column "${columnName}" cannot be deleted`);
    }
    await this.assertTableExists(schemaName, tableName);
    const existingCols = await this.rawColumns(schemaName, tableName);
    if (!existingCols.some((c) => c.column_name === columnName)) {
      throw new NotFoundException(`Column "${columnName}" not found`);
    }

    await this.db.transaction(async (tx) => {
      await tx.execute(
        sql.raw(
          `ALTER TABLE ${qualified(schemaName, tableName)} DROP COLUMN ${quoteIdentifier(columnName)}`,
        ),
      );
      await tx
        .delete(tenantColumnDisplay)
        .where(
          and(
            eq(tenantColumnDisplay.workspaceId, workspaceId),
            eq(tenantColumnDisplay.tableName, tableName),
            eq(tenantColumnDisplay.columnName, columnName),
          ),
        );
    });

    await this.audit(actorUserId, companyId, 'column.deleted', 'column', columnName, { tableName, columnName });
  }

  async reorderColumns(
    actorUserId: string,
    companyId: string,
    workspaceId: string,
    schemaName: string,
    tableName: string,
    order: string[],
  ): Promise<void> {
    await this.assertTableExists(schemaName, tableName);
    const existingCols = await this.rawColumns(schemaName, tableName);
    const userColumnNames = existingCols
      .filter((c) => !SYSTEM_COLUMNS.has(c.column_name))
      .map((c) => c.column_name)
      .sort();
    const requested = [...order].sort();

    if (
      requested.length !== userColumnNames.length ||
      requested.some((name, i) => name !== userColumnNames[i])
    ) {
      throw new BadRequestException('Column order must include exactly the table\'s current user-managed columns');
    }

    await this.db.transaction(async (tx) => {
      for (let i = 0; i < order.length; i += 1) {
        await tx
          .insert(tenantColumnDisplay)
          .values({ workspaceId, tableName, columnName: order[i], displayOrder: i + 1 })
          .onConflictDoUpdate({
            target: [tenantColumnDisplay.workspaceId, tenantColumnDisplay.tableName, tenantColumnDisplay.columnName],
            set: { displayOrder: i + 1, updatedAt: new Date() },
          });
      }
    });

    await this.audit(actorUserId, companyId, 'columns.reordered', 'table', tableName, { tableName, order });
  }
}
