# Database Architecture

Separate the control plane from tenant-owned dynamic structures.

Control plane contains companies, users, memberships, statuses, workspace metadata and audit events.

Tenant plane contains company-created tables in the approved tenant schema strategy.

Control-plane changes use versioned migrations. Runtime DDL is performed only by a controlled Schema Management service and is audited.
