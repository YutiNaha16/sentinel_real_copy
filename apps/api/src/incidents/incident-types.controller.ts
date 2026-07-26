import { Controller, Get } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { IncidentsService } from './incidents.service';

@Controller('incident-types')
export class IncidentTypesController {
  constructor(private readonly incidents: IncidentsService) {}

  @Roles(Role.ADMIN, Role.MEMBER, Role.REPORTER)
  @Get()
  list() {
    return this.incidents.listTypes();
  }
}
