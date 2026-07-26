import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';
import { IncidentsService } from './incidents.service';
import { IncidentsController } from './incidents.controller';
import { IncidentTypesController } from './incident-types.controller';
import { PublicAckController } from './public-ack.controller';

@Module({
  imports: [AuditModule, EmailModule],
  providers: [IncidentsService],
  controllers: [IncidentsController, IncidentTypesController, PublicAckController],
})
export class IncidentsModule {}
