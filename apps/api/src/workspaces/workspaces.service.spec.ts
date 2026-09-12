import { WorkspacesService } from './workspaces.service';
import { assertSafeIdentifier } from '../common/sql-identifier.util';

describe('WorkspacesService schema naming', () => {
  // Constructor only stores its dependencies; no DB/audit calls happen
  // until a method that needs them is invoked, so fakes are enough here.
  const service = new WorkspacesService({} as any, {} as any);
  const schemaNameForCompany = (companyId: string): string =>
    (service as any).schemaNameForCompany(companyId);

  it('derives a schema name from the company id that always passes assertSafeIdentifier', () => {
    const schemaName = schemaNameForCompany('123e4567-e89b-12d3-a456-426614174000');
    expect(schemaName).toBe('tenant_123e4567e89b12d3a456426614174000');
    expect(() => assertSafeIdentifier(schemaName)).not.toThrow();
  });

  it('is deterministic for the same company id', () => {
    const companyId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    expect(schemaNameForCompany(companyId)).toBe(schemaNameForCompany(companyId));
  });
});
