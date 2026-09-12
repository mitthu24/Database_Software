import { assertSafeIdentifier, normalizeToIdentifier, quoteIdentifier, UnsafeIdentifierError } from './sql-identifier.util';

describe('sql-identifier.util', () => {
  it('accepts a normal lowercase identifier', () => {
    expect(() => assertSafeIdentifier('customer_orders')).not.toThrow();
  });

  it.each([
    'Customers', // uppercase
    '1customers', // leading digit
    'customers; DROP TABLE users; --', // injection attempt
    'customers"drop', // embedded quote
    'public', // reserved
    'select', // reserved keyword
    '', // empty
  ])('rejects unsafe identifier %p', (identifier) => {
    expect(() => assertSafeIdentifier(identifier)).toThrow(UnsafeIdentifierError);
  });

  it('normalizes a display name into a candidate identifier that passes validation', () => {
    const normalized = normalizeToIdentifier('Customer Orders!');
    expect(normalized).toBe('customer_orders');
    expect(() => assertSafeIdentifier(normalized)).not.toThrow();
  });

  it('escapes embedded double quotes when rendering', () => {
    expect(quoteIdentifier('weird"name')).toBe('"weird""name"');
  });
});
