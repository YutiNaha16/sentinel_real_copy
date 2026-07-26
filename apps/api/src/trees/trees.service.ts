import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Node, Role } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/current-user.decorator';
import { AddNodeDto, EditNodeDto } from './dto/node.dto';
import { ActivateScope } from './dto/activate.dto';
import { EmailService } from '../email/email.service';

const csv = (rows: string[][]) =>
  rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\n');

@Injectable()
export class TreesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
  ) {}

  /**
   * Initiate Call Tree — a one-way cascade/broadcast alert (distinct from incident
   * escalation). Notifies everyone below the initiator (down), above them (up), or the
   * whole tree, PLUS each recipient's backup so a "broken" node is still covered.
   * Audited and surfaced in Notifications; returns who was reached.
   */
  async activate(scope: ActivateScope, message: string, user: AuthenticatedUser) {
    const tree = await this.prisma.callTree.findUnique({
      where: { key: 'it-cyber' },
      include: { nodes: { where: { active: true } } },
    });
    if (!tree) throw new NotFoundException('Tree not found');
    const nodes = tree.nodes;
    const byId = new Map(nodes.map((n) => [n.id, n]));

    // Determine the primary targets by scope.
    let targets: Node[];
    if (scope === ActivateScope.WHOLE) {
      targets = nodes.filter((n) => n.id !== user.nodeId);
    } else {
      const start = user.nodeId ? byId.get(user.nodeId) : undefined;
      if (!start) {
        // Admin (not in the tree): "down" = whole tree; "up" has no meaning.
        if (scope === ActivateScope.DOWN) targets = [...nodes];
        else throw new BadRequestException('"up" requires you to be a member of the tree');
      } else if (scope === ActivateScope.DOWN) {
        targets = this.descendants(start.id, nodes);
      } else {
        targets = this.ancestors(start, byId);
      }
    }

    // Add each target's backup so an unavailable ("broken") node is still covered.
    const recipients = new Map<string, Node>();
    for (const t of targets) {
      recipients.set(t.id, t);
      if (t.backupId) {
        const b = byId.get(t.backupId);
        if (b) recipients.set(b.id, b);
      }
    }
    const list = [...recipients.values()];

    const prefix = process.env.EMAIL_SUBJECT_PREFIX ? `${process.env.EMAIL_SUBJECT_PREFIX} ` : '';
    const subject = `${prefix}[SENTINEL] CALL TREE ACTIVATION`;
    const body =
      `*** CALL TREE ACTIVATION — ${scope.toUpperCase()} ***\n\n` +
      `${message}\n\n` +
      `Triggered by: ${user.displayName}\n` +
      `This is a broadcast alert. Follow your crisis procedure and confirm with your coordinator.`;

    const results = list.length
      ? await this.email.broadcast(
          list.map((n) => ({ name: n.displayName, email: n.email, phone: n.phone })),
          subject,
          body,
        )
      : [];

    await this.audit.logUserAction({
      actorLabel: user.displayName,
      actorUserId: user.userId,
      action: `Initiated call tree (${scope})`,
      target: `${list.length} notified — "${message.slice(0, 80)}"`,
    });

    return { scope, count: list.length, reached: results };
  }

  /** All nodes below the given node (recursive children via parentId). */
  private descendants(startId: string, nodes: Node[]): Node[] {
    const out: Node[] = [];
    const queue = nodes.filter((n) => n.parentId === startId);
    while (queue.length) {
      const n = queue.shift()!;
      out.push(n);
      queue.push(...nodes.filter((c) => c.parentId === n.id));
    }
    return out;
  }

  /** All nodes above the given node (walk parentId up to the root). */
  private ancestors(start: Node, byId: Map<string, Node>): Node[] {
    const out: Node[] = [];
    let cur = start.parentId ? byId.get(start.parentId) : undefined;
    const seen = new Set<string>();
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      out.push(cur);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return out;
  }

  async getItCyber(user: AuthenticatedUser) {
    const tree = await this.prisma.callTree.findUnique({
      where: { key: 'it-cyber' },
      include: { nodes: { where: { active: true }, orderBy: { order: 'asc' } } },
    });
    if (!tree) throw new NotFoundException('Tree not found');

    const byId = new Map(tree.nodes.map((n) => [n.id, n]));
    const view = (n: Node | null | undefined) =>
      n
        ? {
            id: n.id,
            order: n.order,
            displayName: n.displayName,
            title: n.title,
            email: n.email,
            phone: n.phone,
            parentName: n.parentId ? byId.get(n.parentId)?.displayName ?? null : null,
            backupName: n.backupId ? byId.get(n.backupId)?.displayName ?? null : null,
            backupId: n.backupId ?? null,
          }
        : null;

    if (user.role === Role.ADMIN) {
      return { scope: 'full' as const, nodes: tree.nodes.map((n) => view(n)) };
    }
    if (user.role === Role.MEMBER) {
      const self = tree.nodes.find((n) => n.id === user.nodeId);
      if (!self) throw new ForbiddenException('You are not part of this tree');
      const parent = self.parentId ? byId.get(self.parentId) ?? null : null;
      const backup = self.backupId ? byId.get(self.backupId) ?? null : null;
      const reports = tree.nodes.filter((n) => n.parentId === self.id);
      return {
        scope: 'member' as const,
        view: {
          parent: view(parent),
          self: view(self),
          backup: view(backup),
          reports: reports.map((n) => view(n)),
        },
      };
    }
    throw new ForbiddenException('Not permitted');
  }

  // --- Feature 009: admin editing ---

  private async treeId(): Promise<string> {
    const t = await this.prisma.callTree.findUnique({ where: { key: 'it-cyber' } });
    if (!t) throw new NotFoundException('Tree not found');
    return t.id;
  }

  /** Keep active nodes contiguous (order 1..N) with parent = the node directly above. */
  private async resequence(treeId: string) {
    const nodes = await this.prisma.node.findMany({
      where: { treeId, active: true },
      orderBy: { order: 'asc' },
    });
    // pass 1: temp high orders to avoid unique-constraint collisions
    for (let i = 0; i < nodes.length; i++) {
      await this.prisma.node.update({ where: { id: nodes[i].id }, data: { order: 1000 + i } });
    }
    // pass 2: final order + parent chain
    for (let i = 0; i < nodes.length; i++) {
      await this.prisma.node.update({
        where: { id: nodes[i].id },
        data: { order: i + 1, parentId: i === 0 ? null : nodes[i - 1].id },
      });
    }
  }

  private async adminList() {
    const treeId = await this.treeId();
    const nodes = await this.prisma.node.findMany({
      where: { treeId, active: true },
      orderBy: { order: 'asc' },
    });
    const byId = new Map(nodes.map((n) => [n.id, n]));
    return {
      scope: 'full' as const,
      nodes: nodes.map((n) => ({
        id: n.id,
        order: n.order,
        displayName: n.displayName,
        title: n.title,
        email: n.email,
        phone: n.phone,
        parentName: n.parentId ? byId.get(n.parentId)?.displayName ?? null : null,
        backupName: n.backupId ? byId.get(n.backupId)?.displayName ?? null : null,
        backupId: n.backupId ?? null,
      })),
    };
  }

  private async validateBackup(treeId: string, backupId: string | undefined, selfId?: string) {
    if (!backupId) return;
    if (backupId === selfId) throw new BadRequestException('Backup cannot be the same person');
    const b = await this.prisma.node.findFirst({ where: { id: backupId, treeId, active: true } });
    if (!b) throw new BadRequestException('Backup not found');
  }

  async addNode(dto: AddNodeDto, user: AuthenticatedUser) {
    const treeId = await this.treeId();
    await this.validateBackup(treeId, dto.backupId);
    const count = await this.prisma.node.count({ where: { treeId, active: true } });
    await this.prisma.node.create({
      data: {
        treeId,
        displayName: dto.displayName.trim(),
        title: dto.title?.trim() ?? '',
        email: dto.email.trim(),
        phone: dto.phone?.trim() ?? '',
        order: count + 1,
        backupId: dto.backupId || null,
      },
    });
    await this.resequence(treeId);
    await this.audit.logConfigChange({
      actorLabel: user.displayName,
      action: 'Added node to tree',
      target: dto.displayName.trim(),
    });
    return this.adminList();
  }

  async editNode(id: string, dto: EditNodeDto, user: AuthenticatedUser) {
    const node = await this.prisma.node.findUnique({ where: { id } });
    if (!node || !node.active) throw new NotFoundException('Person not found');
    const data: Record<string, unknown> = {};
    if (dto.displayName !== undefined) data.displayName = dto.displayName.trim();
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.email !== undefined) data.email = dto.email.trim();
    if (dto.phone !== undefined) data.phone = dto.phone.trim();
    if (dto.backupId !== undefined) {
      const b = dto.backupId.trim() || undefined;
      await this.validateBackup(node.treeId, b, id);
      data.backupId = b ?? null;
    }
    await this.prisma.node.update({ where: { id }, data });
    await this.audit.logConfigChange({
      actorLabel: user.displayName,
      action: 'Edited node',
      target: (dto.displayName ?? node.displayName).trim(),
    });
    return this.adminList();
  }

  async removeNode(id: string, user: AuthenticatedUser) {
    const node = await this.prisma.node.findUnique({ where: { id } });
    if (!node || !node.active) throw new NotFoundException('Person not found');
    // clear references, then soft-remove (preserve incident history) and move out of active order range
    await this.prisma.node.updateMany({ where: { backupId: id }, data: { backupId: null } });
    await this.prisma.user.updateMany({ where: { nodeId: id }, data: { nodeId: null } });
    const agg = await this.prisma.node.aggregate({ where: { treeId: node.treeId }, _min: { order: true } });
    const removedOrder = Math.min(0, agg._min.order ?? 0) - 1;
    await this.prisma.node.update({
      where: { id },
      data: { active: false, parentId: null, backupId: null, order: removedOrder },
    });
    await this.resequence(node.treeId);
    await this.audit.logConfigChange({
      actorLabel: user.displayName,
      action: 'Removed node from tree',
      target: node.displayName,
    });
    return this.adminList();
  }

  async moveNode(id: string, direction: 'up' | 'down', user: AuthenticatedUser) {
    const node = await this.prisma.node.findUnique({ where: { id } });
    if (!node || !node.active) throw new NotFoundException('Person not found');
    const nodes = await this.prisma.node.findMany({
      where: { treeId: node.treeId, active: true },
      orderBy: { order: 'asc' },
    });
    const idx = nodes.findIndex((n) => n.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= nodes.length) {
      throw new BadRequestException(`Cannot move ${direction} from this position`);
    }
    // swap orders via a temp value to dodge the unique constraint
    const a = nodes[idx];
    const b = nodes[swapIdx];
    await this.prisma.node.update({ where: { id: a.id }, data: { order: 9000 } });
    await this.prisma.node.update({ where: { id: b.id }, data: { order: a.order } });
    await this.prisma.node.update({ where: { id: a.id }, data: { order: b.order } });
    await this.resequence(node.treeId);
    await this.audit.logConfigChange({
      actorLabel: user.displayName,
      action: 'Reordered tree',
      target: `${node.displayName} moved ${direction}`,
    });
    return this.adminList();
  }

  async exportCsv(): Promise<string> {
    const treeId = await this.treeId();
    const nodes = await this.prisma.node.findMany({
      where: { treeId, active: true },
      orderBy: { order: 'asc' },
    });
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const rows: string[][] = [['order', 'name', 'role', 'email', 'phone', 'backup']];
    for (const n of nodes) {
      rows.push([
        String(n.order),
        n.displayName,
        n.title,
        n.email,
        n.phone,
        n.backupId ? byId.get(n.backupId)?.displayName ?? '' : '',
      ]);
    }
    return csv(rows);
  }

  sampleTemplate(): string {
    return csv([
      ['order', 'name', 'role', 'email', 'phone', 'backup'],
      ['1', 'Priya Sharma', 'Security Analyst', 'priya.sharma@example.com', '+91 90000 00001', 'Rahul Verma'],
      ['2', 'Rahul Verma', 'Infrastructure Lead', 'rahul.verma@example.com', '+91 90000 00002', ''],
    ]);
  }

  // --- Feature 011: bulk CSV upload ---

  private parseLine(line: string): string[] {
    const out: string[] = [];
    let cur = '';
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i++;
          } else q = false;
        } else cur += ch;
      } else if (ch === ',') {
        out.push(cur);
        cur = '';
      } else if (ch === '"') {
        q = true;
      } else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  }

  private parseCsv(text: string) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) throw new BadRequestException(['File is empty']);
    const header = this.parseLine(lines[0]).map((h) => h.toLowerCase());
    const idx = (n: string) => header.indexOf(n);
    const missing = ['name', 'email'].filter((c) => idx(c) < 0);
    if (missing.length) throw new BadRequestException([`Missing required columns: ${missing.join(', ')}`]);
    const iOrder = idx('order'), iName = idx('name'), iRole = idx('role'), iEmail = idx('email'), iPhone = idx('phone'), iBackup = idx('backup');
    const rows = [] as { line: number; order: number; name: string; role: string; email: string; phone: string; backup: string }[];
    for (let li = 1; li < lines.length; li++) {
      const c = this.parseLine(lines[li]);
      rows.push({
        line: li + 1,
        order: iOrder >= 0 ? parseInt(c[iOrder], 10) : li,
        name: (c[iName] ?? '').trim(),
        role: iRole >= 0 ? (c[iRole] ?? '').trim() : '',
        email: (c[iEmail] ?? '').trim(),
        phone: iPhone >= 0 ? (c[iPhone] ?? '').trim() : '',
        backup: iBackup >= 0 ? (c[iBackup] ?? '').trim() : '',
      });
    }
    return rows;
  }

  private validateRows(rows: ReturnType<TreesService['parseCsv']>): string[] {
    const errors: string[] = [];
    if (rows.length === 0) return ['At least one person is required'];
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const names = new Set<string>();
    const emails = new Set<string>();
    const allNames = new Set(rows.map((r) => r.name.toLowerCase()));
    for (const r of rows) {
      if (!r.name) errors.push(`Row ${r.line}: name is required`);
      if (!emailRe.test(r.email)) errors.push(`Row ${r.line}: email is not valid`);
      if (!Number.isInteger(r.order) || r.order <= 0) errors.push(`Row ${r.line}: order must be a positive integer`);
      const nl = r.name.toLowerCase();
      const el = r.email.toLowerCase();
      if (r.name && names.has(nl)) errors.push(`Row ${r.line}: duplicate name '${r.name}'`);
      names.add(nl);
      if (r.email && emails.has(el)) errors.push(`Row ${r.line}: duplicate email '${r.email}'`);
      emails.add(el);
      if (r.backup) {
        if (r.backup.toLowerCase() === nl) errors.push(`Row ${r.line}: backup cannot be the same person`);
        else if (!allNames.has(r.backup.toLowerCase())) errors.push(`Row ${r.line}: backup '${r.backup}' not found in the file`);
      }
    }
    const orders = rows.map((r) => r.order).filter((o) => Number.isInteger(o) && o > 0).sort((a, b) => a - b);
    if (!(orders.length === rows.length && orders.every((o, i) => o === i + 1))) {
      errors.push('order values must be contiguous 1..N (no gaps or duplicates)');
    }
    return errors;
  }

  async uploadCsv(csvText: string, user: AuthenticatedUser) {
    const rows = this.parseCsv(csvText);
    const errors = this.validateRows(rows);
    if (errors.length) throw new BadRequestException(errors);
    const treeId = await this.treeId();
    const sorted = [...rows].sort((a, b) => a.order - b.order);

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.node.findMany({ where: { treeId, active: true } });
      const byEmail = new Map(existing.map((n) => [n.email.toLowerCase(), n]));
      const nameToId = new Map<string, string>();
      const kept = new Set<string>();

      for (let i = 0; i < sorted.length; i++) {
        const r = sorted[i];
        const el = r.email.toLowerCase();
        kept.add(el);
        const ex = byEmail.get(el);
        let id: string;
        if (ex) {
          await tx.node.update({
            where: { id: ex.id },
            data: { displayName: r.name, title: r.role, phone: r.phone, order: 2000 + i, active: true, backupId: null },
          });
          id = ex.id;
        } else {
          const cr = await tx.node.create({
            data: { treeId, displayName: r.name, title: r.role, email: r.email, phone: r.phone, order: 2000 + i, backupId: null },
          });
          id = cr.id;
        }
        nameToId.set(r.name.toLowerCase(), id);
      }

      const minAgg = await tx.node.aggregate({ where: { treeId }, _min: { order: true } });
      let neg = Math.min(0, minAgg._min.order ?? 0) - 1;
      for (const n of existing) {
        if (kept.has(n.email.toLowerCase())) continue;
        await tx.node.updateMany({ where: { backupId: n.id }, data: { backupId: null } });
        await tx.user.updateMany({ where: { nodeId: n.id }, data: { nodeId: null } });
        await tx.node.update({ where: { id: n.id }, data: { active: false, order: neg, parentId: null, backupId: null } });
        neg--;
      }

      for (const r of sorted) {
        if (!r.backup) continue;
        const bid = nameToId.get(r.backup.toLowerCase());
        const nid = nameToId.get(r.name.toLowerCase());
        if (bid && nid) await tx.node.update({ where: { id: nid }, data: { backupId: bid } });
      }
    });

    await this.resequence(treeId);
    await this.audit.logConfigChange({
      actorLabel: user.displayName,
      action: 'Uploaded escalation matrix',
      target: `${sorted.length} people`,
    });
    return this.adminList();
  }
}
