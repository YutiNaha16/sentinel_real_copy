import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ChainState, EscalationEventKind, Role, Severity } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { AuthenticatedUser } from '../auth/current-user.decorator';
import { CreateIncidentDto } from './dto/create-incident.dto';

const PARALLEL = new Set<Severity>([Severity.L2, Severity.L3]);

@Injectable()
export class IncidentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
  ) {}

  listTypes() {
    return this.prisma.incidentType.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { id: true, key: true, name: true, description: true, defaultSeverity: true },
    });
  }

  private async generateReference(): Promise<string> {
    for (let i = 0; i < 12; i++) {
      const ref = 'INC-' + Math.floor(100000 + Math.random() * 900000);
      const exists = await this.prisma.incident.findUnique({ where: { reference: ref } });
      if (!exists) return ref;
    }
    throw new Error('Unable to generate a unique incident reference');
  }

  async create(user: AuthenticatedUser, dto: CreateIncidentDto) {
    const type = await this.prisma.incidentType.findUnique({ where: { id: dto.typeId } });
    if (!type || !type.active) throw new NotFoundException('Incident type not found');

    const tree = await this.prisma.callTree.findUnique({
      where: { key: 'it-cyber' },
      include: { nodes: { where: { active: true }, orderBy: { order: 'asc' } } },
    });
    if (!tree) throw new NotFoundException('Tree not found');

    const severity = dto.severity ?? type.defaultSeverity;
    if (PARALLEL.has(severity) && !dto.confirmedHighSeverity) {
      throw new ConflictException(
        `Confirmation required for a ${severity} alert — it notifies everyone in the chain at once.`,
      );
    }

    const anonymous = !!dto.anonymous;
    const reporterLabel = anonymous ? 'Anonymous' : user.displayName;
    const reporterUserId = anonymous ? null : user.userId;
    const location = dto.location?.trim() ? dto.location.trim() : '(not specified)';
    const overridden = !!dto.severity && dto.severity !== type.defaultSeverity;
    const reference = await this.generateReference();
    const parallel = PARALLEL.has(severity);

    const created = await this.prisma.$transaction(async (tx) => {
      const inc = await tx.incident.create({
        data: {
          reference,
          treeId: tree.id,
          typeId: type.id,
          severity,
          location,
          description: dto.description.trim(),
          anonymous,
          reporterUserId,
          reporterLabel,
        },
      });
      // Initialise chain state: parallel -> all notified; sequential -> first notified, rest waiting.
      await tx.incidentChainEntry.createMany({
        data: tree.nodes.map((n, i) => ({
          incidentId: inc.id,
          nodeId: n.id,
          order: n.order,
          state: parallel || i === 0 ? ChainState.NOTIFIED : ChainState.WAITING,
          notifiedAt: parallel || i === 0 ? new Date() : null,
        })),
      });
      await this.audit.logUserAction(
        {
          actorLabel: reporterLabel,
          actorUserId: reporterUserId,
          action: 'Reported incident',
          target: `${reference} · severity ${severity} (${overridden ? 'overridden' : 'auto from type'})`,
        },
        tx,
      );
      if (overridden) {
        await this.audit.logUserAction(
          {
            actorLabel: reporterLabel,
            actorUserId: reporterUserId,
            action: 'Overrode severity',
            target: `${reference} · ${type.defaultSeverity} → ${severity}`,
          },
          tx,
        );
      }
      return inc;
    });

    const notifiedNodeIds = parallel
      ? tree.nodes.map((n) => n.id)
      : tree.nodes[0]
        ? [tree.nodes[0].id]
        : [];
    await this.email.notify(created.id, notifiedNodeIds);

    return {
      id: created.id,
      reference: created.reference,
      severity: created.severity,
      status: created.status,
    };
  }

  async list(user: AuthenticatedUser) {
    // Admin/Auditor: all. Reporter: only their own. Member: all in the tree.
    const where = user.role === Role.REPORTER ? { reporterUserId: user.userId } : {};
    const items = await this.prisma.incident.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { type: true, chain: true },
    });
    return items.map((i) => ({
      reference: i.reference,
      createdAt: i.createdAt.toISOString(),
      severity: i.severity,
      typeName: i.type.name,
      location: i.location,
      reporterLabel: i.reporterLabel,
      status: i.status,
      ackCount: i.chain.filter((c) => c.state === ChainState.ACKNOWLEDGED).length,
      chainSize: i.chain.length,
    }));
  }

  /** Active incidents, for the live-view switcher (Admin/Member). */
  async getActive() {
    const items = await this.prisma.incident.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      include: { type: true, chain: true },
    });
    return items.map((i) => ({
      reference: i.reference,
      severity: i.severity,
      status: i.status,
      typeName: i.type.name,
      ackCount: i.chain.filter((c) => c.state === ChainState.ACKNOWLEDGED).length,
      chainSize: i.chain.length,
    }));
  }

  /** Full live tree for one incident (Admin/Member). */
  async getTree(reference: string) {
    const inc = await this.prisma.incident.findUnique({
      where: { reference },
      include: {
        chain: { include: { node: true }, orderBy: { order: 'asc' } },
        events: { orderBy: { at: 'desc' }, take: 10 },
      },
    });
    if (!inc) throw new NotFoundException('Incident not found');
    const entries = inc.chain.map((c) => ({
      nodeId: c.nodeId,
      order: c.order,
      displayName: c.node.displayName,
      title: c.node.title,
      state: c.state,
      notifiedAt: c.notifiedAt?.toISOString() ?? null,
      ackAt: c.ackAt?.toISOString() ?? null,
      reminderCount: c.reminderCount,
    }));
    return {
      reference: inc.reference,
      severity: inc.severity,
      status: inc.status,
      description: inc.description,
      location: inc.location,
      reporterLabel: inc.reporterLabel,
      createdAt: inc.createdAt.toISOString(),
      adminAlarmedAt: inc.adminAlarmedAt?.toISOString() ?? null,
      ackCount: entries.filter((e) => e.state === ChainState.ACKNOWLEDGED).length,
      chainSize: entries.length,
      entries,
      events: inc.events.map((e) => ({ at: e.at.toISOString(), kind: e.kind, message: e.message })),
    };
  }

  /** Acknowledge one chain person. Idempotent; never changes incident status (ACK != Close). */
  async acknowledge(reference: string, nodeId: string, user: AuthenticatedUser) {
    const inc = await this.prisma.incident.findUnique({
      where: { reference },
      include: { chain: true },
    });
    if (!inc) throw new NotFoundException('Incident not found');
    const entry = inc.chain.find((c) => c.nodeId === nodeId);
    if (!entry) throw new NotFoundException('Chain entry not found for that person');

    if (entry.state !== ChainState.ACKNOWLEDGED) {
      await this.prisma.$transaction(async (tx) => {
        await tx.incidentChainEntry.update({
          where: { id: entry.id },
          data: { state: ChainState.ACKNOWLEDGED, ackAt: new Date() },
        });
        const node = await tx.node.findUnique({ where: { id: nodeId } });
        await this.audit.logUserAction(
          {
            actorLabel: user.displayName,
            actorUserId: user.userId,
            action: 'Acknowledged',
            target: `${reference} · ${node?.displayName ?? nodeId}`,
          },
          tx,
        );
      });
    }

    const chain = await this.prisma.incidentChainEntry.findMany({
      where: { incidentId: inc.id },
    });
    return {
      reference,
      nodeId,
      state: ChainState.ACKNOWLEDGED,
      ackCount: chain.filter((c) => c.state === ChainState.ACKNOWLEDGED).length,
      chainSize: chain.length,
    };
  }

  // --- Feature 004: lifecycle (close / override / re-open) ---

  /** Load an incident and assert the actor may manage it (admin, or a chain member). */
  private async loadForManage(reference: string, user: AuthenticatedUser) {
    const inc = await this.prisma.incident.findUnique({
      where: { reference },
      include: { chain: true },
    });
    if (!inc) throw new NotFoundException('Incident not found');
    const inChain = inc.chain.some((c) => c.nodeId === user.nodeId);
    if (user.role !== Role.ADMIN && !(user.role === Role.MEMBER && inChain)) {
      throw new ForbiddenException("Only an admin or a member of this incident's chain can do that");
    }
    return inc;
  }

  async close(reference: string, reason: string, user: AuthenticatedUser) {
    const inc = await this.loadForManage(reference, user);
    if (inc.status === 'RESOLVED') throw new ConflictException('Incident is already resolved');
    const trimmed = reason?.trim();
    if (!trimmed) throw new BadRequestException('A reason is required to close');

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.incident.update({
        where: { id: inc.id },
        data: { status: 'RESOLVED', closedAt: now, closeReason: trimmed },
      });
      await this.audit.logUserAction(
        {
          actorLabel: user.displayName,
          actorUserId: user.userId,
          action: 'Closed incident',
          target: `${reference} · reason: ${trimmed}`,
        },
        tx,
      );
      await tx.escalationEvent.create({
        data: {
          incidentId: inc.id,
          kind: EscalationEventKind.STANDDOWN,
          message: `Stand down — resolved: ${trimmed}. Everyone alerted and the reporter were notified.`,
          at: now,
        },
      });
    });
    return { reference, status: 'RESOLVED', closedAt: now.toISOString() };
  }

  async override(reference: string, severity: Severity, reason: string, user: AuthenticatedUser) {
    const inc = await this.loadForManage(reference, user);
    if (inc.status === 'RESOLVED') throw new ConflictException('Cannot override a resolved incident');
    const trimmed = reason?.trim();
    if (!trimmed) throw new BadRequestException('A reason is required to override');

    const from = inc.severity;
    const now = new Date();
    const nowParallel = severity === Severity.L2 || severity === Severity.L3;
    const waiting = nowParallel
      ? await this.prisma.incidentChainEntry.findMany({
          where: { incidentId: inc.id, state: ChainState.WAITING },
          select: { nodeId: true },
        })
      : [];
    await this.prisma.$transaction(async (tx) => {
      await tx.incident.update({ where: { id: inc.id }, data: { severity } });
      if (nowParallel) {
        // Crossing into parallel notifies anyone still only waiting in the chain.
        await tx.incidentChainEntry.updateMany({
          where: { incidentId: inc.id, state: ChainState.WAITING },
          data: { state: ChainState.NOTIFIED, notifiedAt: now },
        });
      }
      await this.audit.logUserAction(
        {
          actorLabel: user.displayName,
          actorUserId: user.userId,
          action: 'Overrode severity',
          target: `${reference} · ${from} → ${severity} · reason: ${trimmed}`,
        },
        tx,
      );
    });
    if (waiting.length) await this.email.notify(inc.id, waiting.map((w) => w.nodeId));
    return { reference, severity };
  }

  async reopen(reference: string, user: AuthenticatedUser) {
    const inc = await this.prisma.incident.findUnique({ where: { reference } });
    if (!inc) throw new NotFoundException('Incident not found');
    if (inc.status !== 'RESOLVED') throw new ConflictException('Incident is not resolved');

    const isAdmin = user.role === Role.ADMIN;
    const isReporter = !inc.anonymous && !!inc.reporterUserId && inc.reporterUserId === user.userId;
    if (!isAdmin && !isReporter) {
      throw new ForbiddenException(
        inc.anonymous
          ? 'Anonymous incidents can only be re-opened by an admin'
          : 'Only the reporter or an admin can re-open this incident',
      );
    }

    const cfg = await this.prisma.appConfig.findUnique({ where: { id: 1 } });
    const windowHours = cfg?.reopenWindowHours ?? 72;
    if (inc.closedAt) {
      const deadline = new Date(inc.closedAt.getTime() + windowHours * 3600 * 1000);
      if (new Date() > deadline) {
        throw new UnprocessableEntityException(`The ${windowHours}-hour re-open window has passed`);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.incident.update({
        where: { id: inc.id },
        data: { status: 'ACTIVE', adminAlarmedAt: null, closedAt: null, closeReason: null },
      });
      await this.audit.logUserAction(
        {
          actorLabel: user.displayName,
          actorUserId: user.userId,
          action: 'Re-opened incident',
          target: reference,
        },
        tx,
      );
    });
    return { reference, status: 'ACTIVE' };
  }

  /** Acknowledge via a per-person email token (public, no login). Idempotent; never closes. */
  async acknowledgeByToken(token: string) {
    const entry = await this.prisma.incidentChainEntry.findUnique({
      where: { ackToken: token },
      include: { node: true, incident: true },
    });
    if (!entry) return { ok: false as const };
    if (entry.state !== ChainState.ACKNOWLEDGED) {
      await this.prisma.$transaction(async (tx) => {
        await tx.incidentChainEntry.update({
          where: { id: entry.id },
          data: { state: ChainState.ACKNOWLEDGED, ackAt: new Date() },
        });
        await this.audit.logUserAction(
          {
            actorLabel: entry.node.displayName,
            actorUserId: null,
            action: 'Acknowledged',
            target: `${entry.incident.reference} · via email link`,
          },
          tx,
        );
      });
    }
    return { ok: true as const, reference: entry.incident.reference, displayName: entry.node.displayName };
  }
}
