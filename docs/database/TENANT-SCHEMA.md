# Tenant Schema

Each company gets an isolated PostgreSQL schema containing its dynamic tables.

PostgreSQL catalogs are authoritative for actual physical structure. Store only necessary application metadata.

Tenant schema names must be deterministic, normalized and collision-safe. Never concatenate arbitrary user input into SQL identifiers.
