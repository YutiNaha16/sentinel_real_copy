import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EscalationService } from './escalation.service';

/**
 * Drives the escalation engine on a short interval. Disabled via
 * ESCALATION_DISABLED=1 (used by tests, which call processDue() directly with
 * a controlled clock). Guarded against overlapping runs.
 */
@Injectable()
export class EscalationScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('EscalationScheduler');
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private readonly intervalMs = Number(process.env.ESCALATION_TICK_MS ?? 5000);

  constructor(private readonly engine: EscalationService) {}

  onModuleInit() {
    if (process.env.ESCALATION_DISABLED === '1') {
      this.logger.log('escalation engine disabled (ESCALATION_DISABLED=1)');
      return;
    }
    this.timer = setInterval(() => void this.tick(), this.intervalMs);
    this.logger.log(`escalation engine running every ${this.intervalMs}ms`);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const n = await this.engine.processDue(new Date());
      if (n > 0) this.logger.log(`emitted ${n} escalation event(s)`);
    } catch (e) {
      this.logger.error('escalation tick failed', (e as Error).stack);
    } finally {
      this.running = false;
    }
  }
}
