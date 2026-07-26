import { useEffect, useState } from 'react';
import { api } from '../api';
import type { NotificationItem } from '../types';

const CAT: Record<string, { bg: string; fg: string }> = {
  ALERT: { bg: 'var(--warn-soft)', fg: '#a86d00' },
  ACK: { bg: 'var(--good-soft)', fg: 'var(--good)' },
  ESCALATION: { bg: '#fdecdf', fg: '#c2410c' },
  REMINDER: { bg: 'var(--warn-soft)', fg: '#a86d00' },
  ALARM: { bg: 'var(--bad-soft)', fg: 'var(--bad)' },
  'STAND-DOWN': { bg: 'var(--good-soft)', fg: 'var(--good)' },
  CLOSE: { bg: 'var(--good-soft)', fg: 'var(--good)' },
  REOPEN: { bg: 'var(--brand-soft)', fg: 'var(--brand-strong)' },
  OVERRIDE: { bg: 'var(--brand-soft)', fg: 'var(--brand-strong)' },
};

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const load = () =>
      api<NotificationItem[]>('/notifications')
        .then(setItems)
        .catch((e) => setErr((e as Error).message));
    load();
    const id = setInterval(load, 6000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <div className="top">
        <div className="crumb">
          <b>IT / Cyber</b>
          <span className="sep">›</span>
          Notifications
        </div>
        <h2>Notifications</h2>
        <div className="sub">
          The running story of everything the system did — alerts, acknowledgements, escalations,
          reminders, alarms, and stand-downs. Newest first.
        </div>
      </div>

      {err && (
        <div className="note amber">
          <span className="ni">!</span>
          <div>{err}</div>
        </div>
      )}

      <div className="card pad activity">
        {items?.length === 0 && <div className="muted">No activity yet.</div>}
        {items?.map((n, i) => {
          const c = CAT[n.category] ?? { bg: 'var(--panel-soft)', fg: 'var(--muted)' };
          return (
            <div className="ev" key={i}>
              <span className="evkind" style={{ background: c.bg, color: c.fg }}>
                {n.category}
              </span>
              <span>{n.message}</span>
              <span className="evtime">{new Date(n.at).toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
