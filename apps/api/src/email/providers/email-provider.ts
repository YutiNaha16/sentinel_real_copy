export interface OutboundEmail {
  to: string;
  toName: string;
  subject: string;
  body: string;
  /** Recipient phone (E.164-ish), used by phone-based channels like WhatsApp/SMS. */
  toPhone?: string;
}

export interface DeliveryResult {
  deliveredAt?: Date;
  failedReason?: string;
}

export interface EmailProvider {
  deliver(msg: OutboundEmail): Promise<DeliveryResult>;
}

/** Default: no real send — the message is shown in the in-app mock inbox. */
export class MockEmailProvider implements EmailProvider {
  async deliver(): Promise<DeliveryResult> {
    return { deliveredAt: new Date() };
  }
}

/**
 * Real send via the Brevo transactional email HTTPS API. Off by default.
 * Uses HTTPS (built-in fetch) — not SMTP — because the pilot network blocks SMTP ports.
 * Configure: EMAIL_PROVIDER=http, EMAIL_API_KEY, EMAIL_FROM ("Name <email>"),
 * optional EMAIL_API_URL (defaults to Brevo).
 */
export class HttpEmailProvider implements EmailProvider {
  async deliver(msg: OutboundEmail): Promise<DeliveryResult> {
    const url = process.env.EMAIL_API_URL || 'https://api.brevo.com/v3/smtp/email';
    const key = process.env.EMAIL_API_KEY;
    const from = process.env.EMAIL_FROM || 'SENTINEL <onboarding@resend.dev>';
    if (!key) return { failedReason: 'EMAIL_API_KEY not configured' };
    const m = from.match(/^\s*(.*?)\s*<(.+)>\s*$/);
    const senderName = m ? m[1] || 'SENTINEL' : 'SENTINEL';
    const senderEmail = m ? m[2] : from;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: msg.to, name: msg.toName }],
          subject: msg.subject,
          textContent: msg.body,
        }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        return { failedReason: `provider ${res.status}: ${t.slice(0, 300)}` };
      }
      return { deliveredAt: new Date() };
    } catch (e) {
      return { failedReason: (e as Error).message };
    }
  }
}

/**
 * Real send via the Twilio WhatsApp API (works to India, unlike US->IN SMS). Off by default.
 * Uses HTTPS (built-in fetch). Configure:
 *   EMAIL_PROVIDER=whatsapp, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
 *   TWILIO_WHATSAPP_FROM (e.g. "whatsapp:+14155238886" — the sandbox number).
 * Recipients must have joined the Twilio WhatsApp sandbox (trial) or be reachable
 * via an approved sender (production).
 */
export class TwilioWhatsAppProvider implements EmailProvider {
  async deliver(msg: OutboundEmail): Promise<DeliveryResult> {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
    if (!sid || !token) return { failedReason: 'TWILIO_ACCOUNT_SID/AUTH_TOKEN not configured' };
    if (!msg.toPhone) return { failedReason: 'recipient has no phone number' };
    // Normalise to E.164 (Twilio wants "whatsapp:+919606682682", no spaces/dashes).
    const digits = msg.toPhone.replace(/[^\d+]/g, '');
    const to = `whatsapp:${digits}`;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const params = new URLSearchParams({ From: from, To: to, Body: `${msg.subject}\n\n${msg.body}` });
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        return { failedReason: `twilio ${res.status}: ${t.slice(0, 300)}` };
      }
      return { deliveredAt: new Date() };
    } catch (e) {
      return { failedReason: (e as Error).message };
    }
  }
}
