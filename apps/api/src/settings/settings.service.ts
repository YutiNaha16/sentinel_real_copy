import { Injectable } from '@nestjs/common';
import { Severity } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/current-user.decorator';
import { EscalationLevelDto, MappingItemDto, UpdateGeneralDto } from './settings.dto';

const SEV_ORDER: Severity[] = [Severity.L0, Severity.L1, Severity.L2, Severity.L3];

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async get() {
    const [levels, types, general] = await Promise.all([
      this.prisma.escalationConfig.findMany(),
      this.prisma.incidentType.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.appConfig.findUnique({ where: { id: 1 } }),
    ]);
    const orderedLevels = SEV_ORDER.map((s) => levels.find((l) => l.severity === s))
      .filter((l): l is (typeof levels)[number] => !!l)
      .map((l) => ({
        severity: l.severity,
        escalateAfterSec: l.escalateAfterSec,
        remindEverySec: l.remindEverySec,
        maxReminders: l.maxReminders,
        adminAlarmAfterSec: l.adminAlarmAfterSec,
      }));
    return {
      levels: orderedLevels,
      severityMapping: types.map((t) => ({
        id: t.id,
        key: t.key,
        name: t.name,
        description: t.description,
        defaultSeverity: t.defaultSeverity,
      })),
      general: {
        reopenWindowHours: general?.reopenWindowHours ?? 72,
        retentionMonths: general?.retentionMonths ?? 18,
      },
    };
  }

  async updateEscalation(levels: EscalationLevelDto[], user: AuthenticatedUser) {
    const current = await this.prisma.escalationConfig.findMany();
    for (const l of levels) {
      const cur = current.find((c) => c.severity === l.severity);
      if (!cur) continue;
      const diffs: string[] = [];
      if (cur.escalateAfterSec !== l.escalateAfterSec) diffs.push(`escalate ${cur.escalateAfterSec}→${l.escalateAfterSec}s`);
      if (cur.remindEverySec !== l.remindEverySec) diffs.push(`remind ${cur.remindEverySec}→${l.remindEverySec}s`);
      if (cur.maxReminders !== l.maxReminders) diffs.push(`reminders ${cur.maxReminders}→${l.maxReminders}`);
      if (cur.adminAlarmAfterSec !== l.adminAlarmAfterSec) diffs.push(`alarm ${cur.adminAlarmAfterSec}→${l.adminAlarmAfterSec}s`);
      if (diffs.length) {
        await this.prisma.escalationConfig.update({
          where: { severity: l.severity },
          data: {
            escalateAfterSec: l.escalateAfterSec,
            remindEverySec: l.remindEverySec,
            maxReminders: l.maxReminders,
            adminAlarmAfterSec: l.adminAlarmAfterSec,
          },
        });
        await this.audit.logConfigChange({
          actorLabel: user.displayName,
          action: `Changed ${l.severity} escalation`,
          target: diffs.join(', '),
        });
      }
    }
    return (await this.get()).levels;
  }

  async updateMapping(mapping: MappingItemDto[], user: AuthenticatedUser) {
    const types = await this.prisma.incidentType.findMany();
    for (const m of mapping) {
      const cur = types.find((t) => t.id === m.id);
      if (!cur || cur.defaultSeverity === m.defaultSeverity) continue;
      await this.prisma.incidentType.update({
        where: { id: m.id },
        data: { defaultSeverity: m.defaultSeverity },
      });
      await this.audit.logConfigChange({
        actorLabel: user.displayName,
        action: 'Edited severity mapping',
        target: `${cur.name}: ${cur.defaultSeverity} → ${m.defaultSeverity}`,
      });
    }
    return (await this.get()).severityMapping;
  }

  async updateGeneral(general: UpdateGeneralDto, user: AuthenticatedUser) {
    const cur = await this.prisma.appConfig.findUnique({ where: { id: 1 } });
    const diffs: string[] = [];
    if (cur?.reopenWindowHours !== general.reopenWindowHours)
      diffs.push(`re-open window ${cur?.reopenWindowHours}→${general.reopenWindowHours}h`);
    if (cur?.retentionMonths !== general.retentionMonths)
      diffs.push(`retention ${cur?.retentionMonths}→${general.retentionMonths}mo`);
    await this.prisma.appConfig.upsert({
      where: { id: 1 },
      update: { reopenWindowHours: general.reopenWindowHours, retentionMonths: general.retentionMonths },
      create: { id: 1, reopenWindowHours: general.reopenWindowHours, retentionMonths: general.retentionMonths },
    });
    if (diffs.length) {
      await this.audit.logConfigChange({
        actorLabel: user.displayName,
        action: 'Edited general config',
        target: diffs.join(', '),
      });
    }
    return (await this.get()).general;
  }
}
