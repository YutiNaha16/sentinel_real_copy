import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './common/prisma.module';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { UsersModule } from './users/users.module';
import { TreesModule } from './trees/trees.module';
import { IncidentsModule } from './incidents/incidents.module';
import { AuditModule } from './audit/audit.module';
import { EscalationModule } from './escalation/escalation.module';
import { MetricsModule } from './metrics/metrics.module';
import { SettingsModule } from './settings/settings.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    TreesModule,
    IncidentsModule,
    AuditModule,
    EscalationModule,
    MetricsModule,
    SettingsModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Global security: authenticate first, then enforce roles. Deny-by-default.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
