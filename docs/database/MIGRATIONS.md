# Migrations

Drizzle migrations manage control-plane schema.

Runtime tenant DDL is not treated as a normal source migration. It is executed by controlled backend services, recorded in audit history and covered by integration/security tests.

Future global tenant migrations require a tested staged strategy.
