import { Controller, Get, Res } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Roles(Role.ADMIN, Role.MEMBER, Role.AUDITOR)
  @Get()
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.metrics.summary(user);
  }

  @Roles(Role.ADMIN, Role.AUDITOR)
  @Get('export.csv')
  async export(@Res() res: Response) {
    const csv = await this.metrics.exportCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="sentinel-metrics.csv"');
    res.send(csv);
  }
}
