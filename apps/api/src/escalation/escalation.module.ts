import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { EscalationService } from './escalation.service';
import { EscalationScheduler } from './escalation.scheduler';

@Module({
  imports: [EmailModule],
  providers: [EscalationService, EscalationScheduler],
  exports: [EscalationService],
})
export class EscalationModule {}
