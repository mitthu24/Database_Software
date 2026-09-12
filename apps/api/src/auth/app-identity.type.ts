import type { CompanyMembership } from '../memberships/memberships.service';

/**
 * The resolved application-level identity: our own `users.id`, plus every
 * active/inactive company membership and role. This is what authorization
 * decisions should be based on — never the raw Firebase token alone.
 */
export interface AppIdentity {
  userId: string;
  email: string;
  status: string;
  memberships: CompanyMembership[];
  isPlatformAdmin: boolean;
}
