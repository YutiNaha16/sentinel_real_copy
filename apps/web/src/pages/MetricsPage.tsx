import { useEffect, useState } from 'react';
import { api, getToken } from '../api';
import { SEV_LABEL } from '../types';
import type { MetricsSummary, Severity } from '../types';

const fmtMin = (v: number | null) => (v == null ? '—' : `${v}`);
const stateLabel: Record<string, string> = {
  ACKNOWLEDGED: 'ACK',
  ESCALATED: 'escalated',
  NOTIFIED: 'notified',
  WAITING: 'waiting',
};

export default function MetricsPage() {
  const [m, setM] = useState<MetricsSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<MetricsSummary>('/metrics')
      .then(setM)
      .catch((e) => setErr((e as Error).message));
  }, []);

  async function exportCsv() {
    try {
      const res = await fetch('/api/metrics/export.csv', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sentinel-metrics.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  const mixMax = m ? Math.max(1, ...m.resolutionMix.map((r) => r.count)) : 1;
  const hopMax = m?.perHop ? Math.max(1, ...m.perHop.hops.map((h) => h.latencySeconds ?? 0)) : 1;

  return (
    <>
      <div className="top">
        <div className="crumb">
          <b>IT / Cyber</b>
          <span className="sep">›</span>
          Metrics
        </div>
        <h2>Metrics — IT / Cyber</h2>
        <div className="sub">
          {m?.scope === 'team' ? "Your team's response performance." : 'Organisation-wide response performance.'}{' '}
          MTTA and MTTR for compliance and improvement analysis.
        </div>
      </div>

      {err && (
        <div className="note amber">
          <span className="ni">!</span>
          <div>{err}</div>
        </div>
      )}

      {m && (
        <>
          {m.canExport && (
            <div className="actions" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button className="btn sec sm" onClick={exportCsv}>
                ↓ Download CSV
              </button>
            </div>
          )}

          <div className="kpis">
            <div className="kpi">
              <div className="lbl">MTTA</div>
              <div className="val">
                {fmtMin(m.mttaMinutes)}
                <small> min</small>
              </div>
              <div className="dsc">mean time to acknowledge</div>
            </div>
            <div className="kpi">
              <div className="lbl">MTTR</div>
              <div className="val">
                {fmtMin(m.mttrMinutes)}
                <small> min</small>
              </div>
              <div className="dsc">mean time to resolution</div>
            </div>
            <div className="kpi">
              <div className="lbl">Ack rate</div>
              <div className="val">
                {m.ackRatePct}
                <small>%</small>
              </div>
              <div className="dsc">alerts acknowledged</div>
            </div>
            <div className="kpi">
              <div className="lbl">Delivery rate</div>
              <div className="val">
                {m.deliveryRatePct}
                <small>%</small>
              </div>
              <div className="dsc">alerts delivered</div>
            </div>
          </div>

          <div className="split">
            <div className="card pad">
              <p className="eyebrow">Per-hop latency {m.perHop ? `— ${m.perHop.reference}` : ''}</p>
              {m.perHop ? (
                <>
                  {m.perHop.hops.map((h, i) => {
                    const pending = h.latencySeconds == null;
                    const stalled = m.perHop!.breakingNode === h.displayName;
                    const w = pending ? 70 : Math.max(4, ((h.latencySeconds ?? 0) / hopMax) * 100);
                    const color = stalled ? 'var(--l2)' : 'var(--l0)';
                    return (
                      <div className="barrow" key={i}>
                        <div className="bl" style={stalled ? { color: 'var(--l2)' } : undefined}>
                          {h.displayName} · {stateLabel[h.state] ?? h.state}
                        </div>
                        <div className="bar">
                          <i style={{ width: `${w}%`, background: color }} />
                        </div>
                        <div className="bv">{pending ? 'pending' : `${h.latencySeconds}s`}</div>
                      </div>
                    );
                  })}
                  {m.perHop.breakingNode && (
                    <div className="note amber" style={{ marginTop: 12 }}>
                      <span className="ni">!</span>
                      <div>
                        <b>Breaking node:</b> {m.perHop.breakingNode} hasn't acknowledged — this flags where the
                        chain stalls.
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="muted">No incident chain to analyse yet.</div>
              )}
            </div>

            <div className="card pad">
              <p className="eyebrow">Resolution mix (last 30 days)</p>
              {m.resolutionMix.map((r) => (
                <div className="barrow" key={r.severity}>
                  <div className="bl">
                    <span className={`sevtag sev${r.severity[1]}`}>{r.severity}</span>
                    {SEV_LABEL[r.severity as Severity]}
                  </div>
                  <div className="bar">
                    <i style={{ width: `${(r.count / mixMax) * 100}%`, background: `var(--l${r.severity[1]})` }} />
                  </div>
                  <div className="bv">{r.count}</div>
                </div>
              ))}
              <p className="muted" style={{ fontSize: 11.5, marginTop: 10 }}>
                {m.totals.incidents} incidents · {m.totals.acknowledged} acknowledged · {m.totals.resolved} resolved
                {m.totalCompletionMinutes != null ? ` · avg completion ${m.totalCompletionMinutes}m` : ''}
              </p>
            </div>
          </div>

          {!m.canExport && (
            <div className="note blue" style={{ marginTop: 14 }}>
              <span className="ni">i</span>
              <div>Report download &amp; sharing is available to admins and auditors. You can view your team's metrics here.</div>
            </div>
          )}
        </>
      )}
    </>
  );
}
