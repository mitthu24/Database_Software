# Dynamic Table Management

MVP operations:
- create table
- rename/delete table
- add/rename/delete column
- change supported column type
- reorder/display-order metadata
- basic constraints

Implement through SchemaManagementService.
Validate identifiers, safely quote identifiers, parameterize values, use transactions where possible, audit success/failure and require confirmation for destructive operations.
