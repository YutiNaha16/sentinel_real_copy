import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../toast';
import type { IncidentType, Severity } from '../types';
import { SEV_LABEL, isParallel } from '../types';

const SEVS: Severity[] = ['L0', 'L1', 'L2', 'L3'];
const Sev = ({ s }: { s: Severity }) => <span className={`sevtag sev${s[1]}`}>{s}</span>;

export default function ReportPage() {
  const [types, setTypes] = useState<IncidentType[]>([]);
  const [sel, setSel] = useState<IncidentType | null>(null);
  const [severity, setSeverity] = useState<Severity>('L0');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const toast = useToast();

  useEffect(() => {
    api<IncidentType[]>('/incident-types')
      .then(setTypes)
      .catch((e) => setErr((e as Error).message));
  }, []);

  function pick(t: IncidentType) {
    setSel(t);
    setSeverity(t.defaultSeverity);
    setErr(null);
  }

  async function send(confirmed: boolean) {
    if (!sel) return;
    if (!description.trim()) {
      setErr('Description is required.');
      return;
    }
    if (isParallel(severity) && !confirmed) {
      setConfirm(true);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ reference: string }>('/incidents', {
        method: 'POST',
        body: {
          typeId: sel.id,
          severity,
          location,
          description,
          anonymous,
          confirmedHighSeverity: isParallel(severity),
        },
      });
      toast(`Alert sent — ${r.reference}`);
      nav('/log');
    } catch (ex) {
      setErr((ex as Error).message);
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="top">
        <div className="crumb">
          <b>IT / Cyber</b>
          <span className="sep">›</span>Report incident
        </div>
        <h2>Report an incident</h2>
        <div className="sub">
          Pick what happened — severity is set automatically from the type and can be overridden. Two steps to send.
        </div>
      </div>

      <div className="card pad">
        <p className="eyebrow">Step 1 · What happened?</p>
        <div className="tiles">
          {types.map((t) => (
            <button key={t.id} className={`tile ${sel?.id === t.id ? 'sel' : ''}`} onClick={() => pick(t)}>
              <div className="thead">
                <Sev s={t.defaultSeverity} />
                <span className="pill">auto</span>
              </div>
              <span className="nm">{t.name}</span>
              <span className="ds">{t.description}</span>
            </button>
          ))}
        </div>

        {sel && (
          <div style={{ marginTop: 18 }}>
            <div className="grid2">
              <div className="field">
                <label>Location</label>
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Data centre, Rack 4" />
              </div>
              <div className="field">
                <label>Severity (override if needed)</label>
                <select value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
                  {SEVS.map((s) => (
                    <option key={s} value={s}>
                      {s} · {SEV_LABEL[s]}
                      {s === sel.defaultSeverity ? ' (default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label>What is happening?</label>
              <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description of the incident" />
            </div>
            <label className="check">
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
              <span>
                <b>Report anonymously</b> — your name won't be attached.{' '}
                <span className="muted">Anonymous reports can only be re-opened by an admin.</span>
              </span>
            </label>
            {err && (
              <div className="err" style={{ marginTop: 10 }}>
                {err}
              </div>
            )}
            <div style={{ marginTop: 18 }}>
              <button
                className={`btn big block ${isParallel(severity) ? 'danger' : 'primary'}`}
                disabled={busy}
                onClick={() => send(false)}
              >
                {isParallel(severity) ? `Send ${severity} alert — confirm required` : `Send ${severity} alert`}
              </button>
            </div>
          </div>
        )}
      </div>

      {confirm && sel && (
        <div
          className="modalback"
          onClick={(e) => {
            if ((e.target as HTMLElement).classList.contains('modalback')) setConfirm(false);
          }}
        >
          <div className="modal">
            <div className="mhead">
              <h3>
                Confirm {severity} {SEV_LABEL[severity]} alert
              </h3>
              <button className="x" onClick={() => setConfirm(false)}>
                ×
              </button>
            </div>
            <div className="mbody">
              <div className="note amber">
                <span className="ni">!</span>
                <div>
                  This is a <b>parallel</b> alert — it notifies <b>everyone in the chain at once</b>. Use {severity} only
                  for genuine {SEV_LABEL[severity].toLowerCase()} incidents.
                </div>
              </div>
            </div>
            <div className="mfoot">
              <button className="btn sec" onClick={() => setConfirm(false)}>
                Cancel
              </button>
              <button
                className="btn danger"
                disabled={busy}
                onClick={() => {
                  setConfirm(false);
                  send(true);
                }}
              >
                Send {severity} alert
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
