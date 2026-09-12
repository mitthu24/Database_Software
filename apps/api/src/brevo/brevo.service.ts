import { Injectable, Logger } from '@nestjs/common';

export interface SendTransactionalEmailInput {
  to: { email: string; name?: string };
  subject: string;
  htmlContent: string;
}

/**
 * Thin wrapper around Brevo's transactional email API. Kept deliberately
 * small — this is the only place that talks to Brevo, so future email
 * templates/flows (password resets, notifications) all go through here
 * rather than each caller re-implementing the HTTP call.
 */
@Injectable()
export class BrevoService {
  private readonly logger = new Logger(BrevoService.name);

  async sendTransactionalEmail(input: SendTransactionalEmailInput): Promise<void> {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    const senderName = process.env.BREVO_SENDER_NAME;

    if (!apiKey || !senderEmail) {
      // Do not throw in Phase 4 scaffold: log so local/dev flows without a
      // configured Brevo account still work end-to-end for everything else.
      this.logger.warn(
        `BREVO_API_KEY/BREVO_SENDER_EMAIL not set — skipping email to ${input.to.email}`,
      );
      return;
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName ?? 'Database Software' },
        to: [input.to],
        subject: input.subject,
        htmlContent: input.htmlContent,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Brevo send failed (${response.status}): ${body}`);
    }
  }
}
