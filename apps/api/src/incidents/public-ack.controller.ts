import { Controller, Get, Header, Param } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { IncidentsService } from './incidents.service';

function page(message: string, ok: boolean): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SENTINEL</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#0d1520;color:#e5e7eb;display:grid;place-items:center;min-height:100vh;margin:0">
<div style="background:#111722;border:1px solid #2a3342;border-radius:16px;padding:32px 28px;max-width:420px;text-align:center">
<div style="font-size:44px;margin-bottom:8px">${ok ? '✅' : '⚠️'}</div>
<p style="font-size:16px;line-height:1.5;margin:0 0 14px">${message}</p>
<p style="color:#8b97ab;font-size:12px;margin:0">SENTINEL Crisis</p></div></body></html>`;
}

/** The public Acknowledge link tapped from an alert email. No authentication. */
@Controller('public')
export class PublicAckController {
  constructor(private readonly incidents: IncidentsService) {}

  @Public()
  @Get('ack/:token')
  @Header('Content-Type', 'text/html')
  async ack(@Param('token') token: string) {
    const r = await this.incidents.acknowledgeByToken(token);
    if (!r.ok) return page('This acknowledgement link is invalid or has expired.', false);
    return page(`You've acknowledged ${r.reference}. Thank you, ${r.displayName}.`, true);
  }
}
