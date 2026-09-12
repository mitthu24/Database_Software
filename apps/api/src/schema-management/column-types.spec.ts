import { friendlyColumnType, resolvePostgresType, UnsupportedColumnTypeError } from './column-types';

describe('column-types', () => {
  it('resolves every supported type key to a Postgres type', () => {
    expect(resolvePostgresType('text')).toBe('text');
    expect(resolvePostgresType('integer')).toBe('integer');
    expect(resolvePostgresType('timestamp')).toBe('timestamptz');
  });

  it('rejects a type that is not on the allow-list', () => {
    // e.g. an attacker-controlled string trying to smuggle raw DDL through
    // the "type" field.
    expect(() => resolvePostgresType('text; DROP TABLE users; --')).toThrow(
      UnsupportedColumnTypeError,
    );
  });

  it('reverse-maps an introspected udt_name back to its supported key', () => {
    expect(friendlyColumnType('int4')).toBe('integer');
    expect(friendlyColumnType('timestamptz')).toBe('timestamp');
    expect(friendlyColumnType('some_unknown_type')).toBeNull();
  });
});
