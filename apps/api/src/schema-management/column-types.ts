/**
 * Allow-list of column types a company user may choose, per
 * docs/database/DYNAMIC-TABLES.md ("change supported column type"). The
 * user-facing value is always one of these map KEYS — never a raw string —
 * so the actual Postgres type name spliced into DDL is always one WE wrote,
 * not attacker-controlled input.
 */
export const SUPPORTED_COLUMN_TYPES = {
  text: 'text',
  integer: 'integer',
  bigint: 'bigint',
  boolean: 'boolean',
  date: 'date',
  timestamp: 'timestamptz',
  numeric: 'numeric',
} as const;

export type SupportedColumnType = keyof typeof SUPPORTED_COLUMN_TYPES;

// information_schema.columns.udt_name reports Postgres's internal type
// name, which differs from the DDL spelling above (e.g. "integer" DDL ->
// "int4" udt_name). Used only for the reverse lookup in `getTable`.
const UDT_NAME_BY_KEY: Record<SupportedColumnType, string> = {
  text: 'text',
  integer: 'int4',
  bigint: 'int8',
  boolean: 'bool',
  date: 'date',
  timestamp: 'timestamptz',
  numeric: 'numeric',
};

export class UnsupportedColumnTypeError extends Error {
  constructor(type: string) {
    super(`Unsupported column type: "${type}"`);
    this.name = 'UnsupportedColumnTypeError';
  }
}

export function resolvePostgresType(type: string): string {
  const resolved = SUPPORTED_COLUMN_TYPES[type as SupportedColumnType];
  if (!resolved) {
    throw new UnsupportedColumnTypeError(type);
  }
  return resolved;
}

/** Reverse lookup so `getTable` can render an introspected `udt_name` back to a supported key (or null if it isn't one we issued). */
export function friendlyColumnType(udtName: string): SupportedColumnType | null {
  const entry = Object.entries(UDT_NAME_BY_KEY).find(([, value]) => value === udtName);
  return (entry?.[0] as SupportedColumnType) ?? null;
}
