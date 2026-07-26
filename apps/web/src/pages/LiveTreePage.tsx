import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { SEV_LABEL } from '../types';
import type { ActiveIncidentSummary, ChainState, InboxEmail, LiveTree, Severity } from '../types';

const sevClass = (s: string) => `sevtag sev${s.slice(1)}`;
const pos = (order: number) => (order === 1 ? '1st' : order === 2 ? '2nd' : order === 3 ? '3rd' : `${order}th`);

const stateMeta: Record<ChainState, { label: string; cls: string; dot: string }> = {
  ACKNOWLEDGED: { label: 'Acknowledged', cls: 'st-ackd', dot: 'var(--good)' },
  ESCALATED: { label: 'Escalated', cls: 'st-escalated', dot: 'var(--l2)' },
  NOTIFIED: { label: 'Notified', cls: 'st-notified', dot: 'var(--l1)' },
  WAITING: { label: 'Waiting in chain', cls: 'st-waiting', dot: '#c8d2df' },
};

const CLOSE_REASONS = [
  'Resolved — service restored',
  'False positive',
  'Duplicate incident',
  'Confirmed & handled (e.g. phishing blocked)',
  'Other',
];
const OVERRIDE_REASONS = [
  'Impact greater than first assessed',
  'Impact lower than first assessed',
  'Reclassified after investigation',
  'Other',
];

const fmtTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

export default function LiveTreePage() {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'MEMBER';

  const [active, setActive] = useState<ActiveIncidentSummary[]>([]);
  const [ref, setRef] = useState<string | null>(null);
  const [tree, setTree] = useState<LiveTree | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [inbox, setInbox] = useState<InboxEmail[]>([]);

  const [modal, setModal] = useState<'close' | 'override' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [closeReason, setCloseReason] = useState(CLOSE_REASONS[0]);
  const [closeOther, setCloseOther] = useState('');
  const [ovSeverity, setOvSeverity] = useState<Severity>('L3');
  const [ovReason, setOvReason] = useState(OVERRIDE_REASONS[0]);
  const [ovOther, setOvOther] = useState('');

  const loadActive = useCallback(async () => {
    try {
      const a = await api<ActiveIncidentSummary[]>('/incidents/active');
      setActive(a);
      setRef((cur) => (cur && a.some((i) => i.reference === cur) ? cur : a[0]?.reference ?? null));
    } catch (e) {
      setErr((e as Error).message);
    }
  }, []);

  const loadTree = useCallback(async (reference: string) => {
    try {
      setTree(await api<LiveTree>(`/incidents/${reference}/tree`));
    } catch (e) {
      setErr((e as Error).message);
    }
  }, []);

  const loadInbox = useCallback(async (reference: string) => {
    try {
      setInbox(await api<InboxEmail[]>(`/incidents/${reference}/emails`));
    } catch {
      /* inbox is best-effort */
    }
  }, []);

  useEffect(() => {
    loadActive();
  }, [loadActive]);
  useEffect(() => {
    if (ref) {
      loadTree(ref);
      loadInbox(ref);
    } else {
      setTree(null);
      setInbox([]);
    }
  }, [ref, loadTree, loadInbox]);
  useEffect(() => {
    const id = setInterval(() => {
      loadActive();
      if (ref && !modal) {
        loadTree(ref);
        loadInbox(ref);
      }
    }, 4000);
    return () => clearInterval(id);
  }, [ref, modal, loadActive, loadTree, loadInbox]);

  async function acknowledge(nodeId: string) {
    if (!ref) return;
    setBusy(nodeId);
    try {
      await api(`/incidents/${ref}/ack`, { method: 'POST', body: { nodeId } });
      await loadTree(ref);
      await loadActive();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function ackViaEmail(link: string) {
    try {
      await fetch(link); // public token endpoint — simulates tapping the email's Acknowledge link
      if (ref) {
        await loadTree(ref);
        await loadInbox(ref);
        await loadActive();
      }
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function doClose() {
    if (!ref) return;
    const reason = (closeReason === 'Other' ? closeOther : closeReason).trim();
    if (!reason) {
      setErr('A reason is required to close');
      return;
    }
    setSubmitting(true);
    try {
      await api(`/incidents/${ref}/close`, { method: 'POST', body: { reason } });
      setModal(null);
      setRef(null);
      await loadActive();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function doOverride() {
    if (!ref) return;
    const reason = (ovReason === 'Other' ? ovOther : ovReason).trim();
    if (!reason) {
      setErr('A reason is required to override');
      return;
    }
    setSubmitting(true);
    try {
      await api(`/incidents/${ref}/override`, { method: 'POST', body: { severity: ovSeverity, reason } });
      setModal(null);
      await loadTree(ref);
      await loadActive();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="top">
        <div className="crumb">
          <b>IT / Cyber</b>
          <span className="sep">›</span>
          Live tree
        </div>
        <h2>Live escalation tree</h2>
        <div className="sub">
          Who's been alerted and who has acknowledged — the system escalates, reminds, and alarms on
          its own. Updating in near real time.
        </div>
      </div>

      {err && (
        <div className="note amber">
          <span className="ni">!</span>
          <div>{err}</div>
        </div>
      )}

      {active.length === 0 && (
        <div className="card pad" style={{ color: 'var(--muted)' }}>
          No active incidents right now. Report one to see the live tree.
        </div>
      )}

      {active.length > 0 && (
        <div className="inctabs">
          {active.map((i) => (
            <button
              key={i.reference}
              className={`inctab ${i.reference === ref ? 'on' : ''}`}
              onClick={() => setRef(i.reference)}
            >
              <span className={sevClass(i.severity)}>{i.severity}</span>
              {i.reference}
              <span className="pill">
                {i.ackCount}/{i.chainSize}
              </span>
            </button>
          ))}
        </div>
      )}

      {tree && (
        <>
          {tree.adminAlarmedAt && (
            <div className="alarmbanner">
              <span>🚨</span>
              <div>
                ADMIN ALARM — nobody in the chain acknowledged {tree.reference}. Raised at{' '}
                {fmtTime(tree.adminAlarmedAt)}.
              </div>
            </div>
          )}

          <div className="card pad" style={{ marginBottom: 14 }}>
            <div className="livehead">
              <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                <span className={sevClass(tree.severity)}>{tree.severity}</span>
                <b className="mono" style={{ fontSize: 16 }}>
                  {tree.reference}
                </b>
                <span className={`statetag ${tree.status === 'ACTIVE' ? 'st-notified' : 'st-ackd'}`}>
                  {tree.status}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Acknowledged</div>
                <div className="ackcount">
                  {tree.ackCount}
                  <small>/{tree.chainSize}</small>
                </div>
              </div>
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 12.5, marginTop: 8 }}>
              {tree.description} · {tree.location} · reported by {tree.reporterLabel} ·{' '}
              {SEV_LABEL[tree.severity]}
            </div>
          </div>

          <div className="card pad">
            <div className="tree">
              {tree.entries.map((e, i) => {
                const meta = stateMeta[e.state];
                return (
                  <div className="tnode" key={e.nodeId}>
                    <div className="trail">
                      <div className="tdot" style={{ background: meta.dot }} />
                      {i < tree.entries.length - 1 && <div className="tline" />}
                    </div>
                    <div className={`tcard ${e.state === 'ACKNOWLEDGED' ? 'ackd' : ''}`}>
                      <div className="av">{e.displayName[0]}</div>
                      <div className="who2">
                        <b>
                          {e.displayName} <span className="tag">{pos(e.order)}</span>
                        </b>
                        <div className="role">{e.title}</div>
                      </div>
                      <div className="stcol">
                        <span className={`statetag ${meta.cls}`}>{meta.label}</span>
                        {e.state === 'ACKNOWLEDGED' && e.ackAt ? (
                          <span className="lat">at {fmtTime(e.ackAt)}</span>
                        ) : e.reminderCount > 0 ? (
                          <span className="lat">
                            {e.reminderCount} reminder{e.reminderCount > 1 ? 's' : ''}
                          </span>
                        ) : null}
                        {tree.status === 'ACTIVE' && e.state !== 'ACKNOWLEDGED' && (
                          <button
                            className="btn good sm"
                            disabled={busy === e.nodeId}
                            onClick={() => acknowledge(e.nodeId)}
                          >
                            ✓ Acknowledge
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {tree.status === 'ACTIVE' && canManage && (
              <div className="actions" style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button className="btn good" onClick={() => setModal('close')}>
                  ✓ Close incident
                </button>
                <button className="btn sec" onClick={() => setModal('override')}>
                  ⇅ Override severity
                </button>
              </div>
            )}
          </div>

          {tree.events.length > 0 && (
            <div className="card pad activity" style={{ marginTop: 14 }}>
              <p className="eyebrow">Recent activity — what the system did automatically</p>
              {tree.events.map((ev, idx) => (
                <div className="ev" key={idx}>
                  <span className={`evkind ${ev.kind}`}>{ev.kind}</span>
                  <span>{ev.message}</span>
                  <span className="evtime">{fmtTime(ev.at)}</span>
                </div>
              ))}
            </div>
          )}

          {inbox.length > 0 && (
            <div className="card pad" style={{ marginTop: 14 }}>
              <p className="eyebrow">Delivered emails — mock inbox (tap Acknowledge to simulate the recipient)</p>
              {inbox.map((m, i) => (
                <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                  <div style={{ fontSize: 12 }}>
                    To: <b>{m.toName}</b> <span className="muted">&lt;{m.toEmail}&gt;</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 12.5, margin: '4px 0' }}>
                    <span className={`sevtag sev${m.severity[1]}`}>{m.severity}</span> {m.subject}
                  </div>
                  <div className="muted" style={{ fontSize: 11.5, whiteSpace: 'pre-wrap', marginBottom: 8 }}>
                    {m.body.split('\n').slice(0, 3).join('\n')}
                  </div>
                  <button className="btn good sm" onClick={() => ackViaEmail(m.ackLink)}>
                    ✓ Acknowledge this alert
                  </button>
                  {m.failedReason && (
                    <span className="muted" style={{ marginLeft: 8, fontSize: 11 }}>delivery failed: {m.failedReason}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {modal === 'close' && tree && (
        <div className="modalback" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="mhead">
              <h3>Close {tree.reference}</h3>
              <button className="x" onClick={() => setModal(null)}>
                ×
              </button>
            </div>
            <div className="mbody">
              <div className="field">
                <label>Reason for closing</label>
                <select value={closeReason} onChange={(e) => setCloseReason(e.target.value)}>
                  {CLOSE_REASONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
              {closeReason === 'Other' && (
                <div className="field">
                  <label>Describe</label>
                  <input value={closeOther} onChange={(e) => setCloseOther(e.target.value)} placeholder="Enter reason" />
                </div>
              )}
              <div className="note blue">
                <span className="ni">i</span>
                <div>Everyone alerted and the reporter will be notified that this is resolved.</div>
              </div>
            </div>
            <div className="mfoot">
              <button className="btn sec" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button className="btn good" disabled={submitting} onClick={doClose}>
                Close incident
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'override' && tree && (
        <div className="modalback" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="mhead">
              <h3>Override severity — {tree.reference}</h3>
              <button className="x" onClick={() => setModal(null)}>
                ×
              </button>
            </div>
            <div className="mbody">
              <div className="field">
                <label>New severity (currently {tree.severity})</label>
                <select value={ovSeverity} onChange={(e) => setOvSeverity(e.target.value as Severity)}>
                  {(['L0', 'L1', 'L2', 'L3'] as Severity[]).map((s) => (
                    <option key={s} value={s}>
                      {s} · {SEV_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Reason</label>
                <select value={ovReason} onChange={(e) => setOvReason(e.target.value)}>
                  {OVERRIDE_REASONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
              {ovReason === 'Other' && (
                <div className="field">
                  <label>Describe</label>
                  <input value={ovOther} onChange={(e) => setOvOther(e.target.value)} placeholder="Enter reason" />
                </div>
              )}
              <div className="note blue">
                <span className="ni">i</span>
                <div>
                  If this crosses into parallel (L2/L3), anyone still only waiting in the chain is
                  notified. The change is logged.
                </div>
              </div>
            </div>
            <div className="mfoot">
              <button className="btn sec" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button className="btn primary" disabled={submitting} onClick={doOverride}>
                Apply override
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
