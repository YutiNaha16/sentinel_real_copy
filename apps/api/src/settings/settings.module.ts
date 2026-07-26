import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';

@Module({
  imports: [AuditModule],
  providers: [SettingsService],
  controllers: [SettingsController],
})
export class SettingsModule {}
