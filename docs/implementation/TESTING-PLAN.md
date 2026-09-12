# Testing Plan

Unit: token verification, authorization guards, identifier validation, schema service rules.

Integration: company creation, memberships, table creation, column changes.

Security: cross-tenant requests, forged company IDs, unauthorized role changes, SQL identifier injection and destructive actions.

E2E: Super Admin company creation; company user table/column management.

Every discovered security bug becomes a regression test.
