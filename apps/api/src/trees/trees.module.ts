import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';
import { TreesService } from './trees.service';
import { TreesController } from './trees.controller';

@Module({
  imports: [AuditModule, EmailModule],
  providers: [TreesService],
  controllers: [TreesController],
})
export class TreesModule {}
