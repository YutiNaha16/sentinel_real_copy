import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../common/prisma.service';
import {
  EmailProvider,
  HttpEmailProvider,
  MockEmailProvider,
  TwilioWhatsAppProvider,
} from './providers/email-provider';

@Injectable()
export class EmailService {
  private readonly logger = new Logger('Email');
  private readonly provider: EmailProvider;

  constructor(private readonly prisma: PrismaService) {
    this.provider =
      process.env.EMAIL_PROVIDER === 'whatsapp'
        ? new TwilioWhatsAppProvider()
        : process.env.EMAIL_PROVIDER === 'http'
          ? new HttpEmailProvider()
          : new MockEmailProvider();
  }

  /** Generate + deliver an alert email for each of the given nodes on an incident. */
  async notify(incidentId: string, nodeIds: string[]): Promise<void> {
    if (!nodeIds.length) return;
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
      include: { type: true },
    });
    if (!incident) return;
    const base = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';

    for (const nodeId of nodeIds) {
      const entry = await this.prisma.incidentChainEntry.findUnique({
        where: { incidentId_nodeId: { incidentId, nodeId } },
        include: { node: true },
      });
      if (!entry) continue;

      let token = entry.ackToken;
      if (!token) {
        token = randomBytes(24).toString('hex');
        await this.prisma.incidentChainEntry.update({ where: { id: entry.id }, data: { ackToken: token } });
      }
      const ackLink = `${base}/api/public/ack/${token}`;
      const prefix = process.env.EMAIL_SUBJECT_PREFIX ? `${process.env.EMAIL_SUBJECT_PREFIX} ` : '';
      const testBanner = process.env.EMAIL_SUBJECT_PREFIX
        ? `*** TEST of the SENTINEL crisis notification system — this is NOT a real incident. ***\n\n`
        : '';
      const subject = `${prefix}[SENTINEL] ${incident.severity} ${incident.type.name} — ${incident.reference}`;
      const body =
        testBanner +
        `Incident ${incident.reference} (${incident.severity} · ${incident.type.name})\n` +
        `${incident.description}\n` +
        `Location: ${incident.location}\n` +
        `Reported by: ${incident.reporterLabel}\n\n` +
        `Please acknowledge you've received this:\n${ackLink}`;

      const msg = await this.prisma.emailMessage.create({
        data: {
          incidentId,
          nodeId,
          toName: entry.node.displayName,
          toEmail: entry.node.email,
          subject,
          body,
          ackToken: token,
          ackLink,
        },
      });

      const res = await this.provider.deliver({
        to: entry.node.email,
        toName: entry.node.displayName,
        toPhone: entry.node.phone,
        subject,
        body,
      });
      await this.prisma.emailMessage.update({
        where: { id: msg.id },
        data: { deliveredAt: res.deliveredAt ?? null, failedReason: res.failedReason ?? null },
      });
      if (res.failedReason) this.logger.warn(`email to ${entry.node.email} failed: ${res.failedReason}`);
    }
  }

  /**
   * One-way broadcast to a set of recipients (Initiate Call Tree). Not tied to an
   * incident — sends the same message to everyone via the active provider and reports
   * who was reached. No acknowledge link (broadcast is informational).
   */
  async broadcast(
    recipients: { name: string; email: string; phone: string }[],
    subject: string,
    body: string,
  ): Promise<{ name: string; delivered: boolean; error?: string }[]> {
    const out: { name: string; delivered: boolean; error?: string }[] = [];
    for (const r of recipients) {
      const res = await this.provider.deliver({
        to: r.email,
        toName: r.name,
        toPhone: r.phone,
        subject,
        body,
      });
      out.push({ name: r.name, delivered: !res.failedReason, error: res.failedReason });
      if (res.failedReason) this.logger.warn(`broadcast to ${r.name} failed: ${res.failedReason}`);
    }
    return out;
  }

  /** The in-app mock inbox for an incident (newest first). */
  async getInbox(reference: string) {
    const incident = await this.prisma.incident.findUnique({
      where: { reference },
      include: { emails: { orderBy: { createdAt: 'desc' } } },
    });
    if (!incident) throw new NotFoundException('Incident not found');
    return incident.emails.map((e) => ({
      toName: e.toName,
      toEmail: e.toEmail,
      subject: e.subject,
      severity: incident.severity,
      body: e.body,
      ackLink: e.ackLink,
      deliveredAt: e.deliveredAt?.toISOString() ?? null,
      failedReason: e.failedReason,
    }));
  }
}
