import { Controller, Get, Res } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { Roles } from '../auth/roles.decorator';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Roles(Role.ADMIN, Role.AUDITOR)
  @Get()
  trail() {
    return this.audit.getTrail();
  }

  @Roles(Role.ADMIN, Role.AUDITOR)
  @Get('export.csv')
  async export(@Res() res: Response) {
    const csv = await this.audit.toCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="sentinel-audit.csv"');
    res.send(csv);
  }
}
