/**
 * Identifier policy for dynamic DDL (schemas, tables, columns).
 *
 * Per AGENTS.md and docs/database/DYNAMIC-TABLES.md: never concatenate raw
 * user input into SQL. Every identifier used in a DDL statement must first
 * pass `assertSafeIdentifier`, then be rendered with `quoteIdentifier`.
 *
 * This is a Phase 1 stub: the rules below are intentionally conservative.
 * The SchemaManagementService (Phase 5) is the only code allowed to call
 * these helpers and issue DDL.
 */

const IDENTIFIER_PATTERN = /^[a-z][a-z0-9_]{0,62}$/;

// Reserved prefixes/names we never want a tenant to collide with.
const RESERVED_NAMES = new Set([
  'pg_catalog',
  'information_schema',
  'public',
  'select',
  'table',
  'column',
  'schema',
]);

export class UnsafeIdentifierError extends Error {
  constructor(identifier: string) {
    super(`Unsafe or invalid SQL identifier: "${identifier}"`);
    this.name = 'UnsafeIdentifierError';
  }
}

/**
 * Throws if `identifier` is not a safe, normalized SQL identifier.
 * Callers should normalize user-facing names (trim, lowercase, replace
 * spaces with underscores) BEFORE calling this, and persist the normalized
 * form, not the original user input.
 */
export function assertSafeIdentifier(identifier: string): void {
  if (!IDENTIFIER_PATTERN.test(identifier)) {
    throw new UnsafeIdentifierError(identifier);
  }
  if (RESERVED_NAMES.has(identifier)) {
    throw new UnsafeIdentifierError(identifier);
  }
}

/**
 * Safely double-quotes a validated identifier for interpolation into DDL.
 * Always call `assertSafeIdentifier` first — this only escapes embedded
 * double quotes, it does not validate.
 */
export function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * Normalizes a user-supplied display name (e.g. "Customer Orders!") into a
 * candidate identifier ("customer_orders"). The result must still pass
 * `assertSafeIdentifier` before use — normalization alone is not validation.
 */
export function normalizeToIdentifier(displayName: string): string {
  return displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 63);
}
