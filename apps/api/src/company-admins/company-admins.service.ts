import { ConflictException, Inject, Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE_DB, Database } from '../db/db.provider';
import { companyMemberships, users } from '../db/schema/control-plane.schema';
import { FIREBASE_ADMIN } from '../auth/firebase-admin.provider';
import { UsersService } from '../users/users.service';
import { CompaniesService } from '../companies/companies.service';
import { AuditService } from '../audit/audit.service';
import { BrevoService } from '../brevo/brevo.service';

@Injectable()
export class CompanyAdminsService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: Database,
    @Inject(FIREBASE_ADMIN) private readonly firebaseApp: admin.app.App,
    private readonly usersService: UsersService,
    private readonly companiesService: CompaniesService,
    private readonly auditService: AuditService,
    private readonly brevoService: BrevoService,
  ) {}

  async listForCompany(companyId: string) {
    return this.db
      .select({
        userId: users.id,
        email: users.email,
        displayName: users.displayName,
        membershipStatus: companyMemberships.status,
      })
      .from(companyMemberships)
      .innerJoin(users, eq(companyMemberships.userId, users.id))
      .where(
        and(eq(companyMemberships.companyId, companyId), eq(companyMemberships.role, 'COMPANY_ADMIN')),
      );
  }

  /**
   * Invite-only per docs/flows/SUPER-ADMIN-FLOW.md — there is no public
   * company-admin signup. Creates the Firebase user if needed, provisions
   * the application `users` row, grants COMPANY_ADMIN membership, and
   * emails a password-setup link via Brevo.
   */
  async invite(actorUserId: string, companyId: string, email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes('@')) {
      throw new ConflictException('A valid email is required');
    }

    await this.companiesService.getOrThrow(companyId); // 404s if company missing

    const firebaseUser = await this.getOrCreateFirebaseUser(normalizedEmail);
    const appUser = await this.usersService.findOrCreateByFirebaseUid(
      firebaseUser.uid,
      normalizedEmail,
    );

    const existingMembership = await this.db
      .select()
      .from(companyMemberships)
      .where(
        and(
          eq(companyMemberships.companyId, companyId),
          eq(companyMemberships.userId, appUser.id),
        ),
      )
      .limit(1);

    if (existingMembership.length > 0) {
      const [updated] = await this.db
        .update(companyMemberships)
        .set({ role: 'COMPANY_ADMIN', status: 'active', updatedAt: new Date() })
        .where(eq(companyMemberships.id, existingMembership[0].id))
        .returning();
      await this.auditService.record({
        actorUserId,
        companyId,
        action: 'company_admin.role_updated',
        resourceType: 'company_membership',
        resourceId: updated.id,
        metadata: { email: normalizedEmail },
      });
    } else {
      const [created] = await this.db
        .insert(companyMemberships)
        .values({ companyId, userId: appUser.id, role: 'COMPANY_ADMIN', status: 'active' })
        .returning();
      await this.auditService.record({
        actorUserId,
        companyId,
        action: 'company_admin.invited',
        resourceType: 'company_membership',
        resourceId: created.id,
        metadata: { email: normalizedEmail },
      });
    }

    await this.sendInviteEmail(normalizedEmail);

    return { email: normalizedEmail, companyId };
  }

  private async getOrCreateFirebaseUser(email: string): Promise<admin.auth.UserRecord> {
    try {
      return await this.firebaseApp.auth().getUserByEmail(email);
    } catch {
      // Firebase throws when no user exists for this email — create one.
      return this.firebaseApp.auth().createUser({ email });
    }
  }

  private async sendInviteEmail(email: string): Promise<void> {
    const link = await this.firebaseApp.auth().generatePasswordResetLink(email);
    await this.brevoService.sendTransactionalEmail({
      to: { email },
      subject: 'You have been added as a company administrator',
      htmlContent: `<p>You have been invited to administer a company workspace.</p><p><a href="${link}">Click here to set your password and sign in</a>.</p>`,
    });
  }
}
