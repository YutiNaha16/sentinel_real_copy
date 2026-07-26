import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { SEV_LABEL } from '../types';
import type { ConfigState, Severity } from '../types';

const SEVS: Severity[] = ['L0', 'L1', 'L2', 'L3'];

export default function ConfigPage() {
  const [cfg, setCfg] = useState<ConfigState | null>(null);
  const [tab, setTab] = useState<'esc' | 'sev' | 'gen'>('esc');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setCfg(await api<ConfigState>('/config'));
    } catch (e) {
      setErr((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function flash(m: string) {
    setMsg(m);
    setErr(null);
    setTimeout(() => setMsg(null), 2500);
  }

  function setLevel(i: number, field: keyof ConfigState['levels'][number], v: number) {
    if (!cfg) return;
    const levels = cfg.levels.map((l, idx) => (idx === i ? { ...l, [field]: v } : l));
    setCfg({ ...cfg, levels });
  }
  function setMapping(i: number, sev: Severity) {
    if (!cfg) return;
    const severityMapping = cfg.severityMapping.map((m, idx) => (idx === i ? { ...m, defaultSeverity: sev } : m));
    setCfg({ ...cfg, severityMapping });
  }

  async function save(path: string, body: unknown, label: string) {
    setErr(null);
    try {
      await api(`/config/${path}`, { method: 'PUT', body });
      await load();
      flash(`${label} saved.`);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  const num = (v: string) => (v === '' ? 0 : parseInt(v, 10) || 0);

  return (
    <>
      <div className="top">
        <div className="crumb">
          <b>IT / Cyber</b>
          <span className="sep">›</span>
          Configuration
        </div>
        <h2>Configuration</h2>
        <div className="sub">
          Per-level timeouts and reminders, incident-type severity mapping, and general settings.
          Admin-only. All changes are audit-logged.
        </div>
      </div>

      {err && (
        <div className="note amber">
          <span className="ni">!</span>
          <div>{err}</div>
        </div>
      )}
      {msg && (
        <div className="note good">
          <span className="ni">✓</span>
          <div>{msg}</div>
        </div>
      )}

      <div className="inctabs">
        <button className={`inctab ${tab === 'esc' ? 'on' : ''}`} onClick={() => setTab('esc')}>
          Escalation levels
        </button>
        <button className={`inctab ${tab === 'sev' ? 'on' : ''}`} onClick={() => setTab('sev')}>
          Severity mapping
        </button>
        <button className={`inctab ${tab === 'gen' ? 'on' : ''}`} onClick={() => setTab('gen')}>
          General
        </button>
      </div>

      {cfg && tab === 'esc' && (
        <>
          <div className="tblwrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Level</th>
                  <th>Escalate after (s)</th>
                  <th>Remind every (s)</th>
                  <th>Max reminders</th>
                  <th>Alarm after (s)</th>
                </tr>
              </thead>
              <tbody>
                {cfg.levels.map((l, i) => (
                  <tr key={l.severity}>
                    <td>
                      <span className={`sevtag sev${l.severity[1]}`}>{l.severity}</span> {SEV_LABEL[l.severity]}
                    </td>
                    <td>
                      <input type="number" min={1} value={l.escalateAfterSec} onChange={(e) => setLevel(i, 'escalateAfterSec', num(e.target.value))} style={{ width: 80 }} />
                    </td>
                    <td>
                      <input type="number" min={1} value={l.remindEverySec} onChange={(e) => setLevel(i, 'remindEverySec', num(e.target.value))} style={{ width: 80 }} />
                    </td>
                    <td>
                      <input type="number" min={1} value={l.maxReminders} onChange={(e) => setLevel(i, 'maxReminders', num(e.target.value))} style={{ width: 70 }} />
                    </td>
                    <td>
                      <input type="number" min={1} value={l.adminAlarmAfterSec} onChange={(e) => setLevel(i, 'adminAlarmAfterSec', num(e.target.value))} style={{ width: 80 }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="note blue" style={{ marginTop: 14 }}>
            <span className="ni">i</span>
            <div>
              <b>Escalate after</b> = no acknowledgement in this time → next person. <b>Remind every</b> = keep nudging.
              <b> Max reminders</b> = stop after N. <b>Alarm after</b> = admin alarm if nobody responds.
            </div>
          </div>
          <div className="actions" style={{ marginTop: 6 }}>
            <button className="btn primary" onClick={() => save('escalation', { levels: cfg.levels }, 'Escalation config')}>
              Save escalation config
            </button>
          </div>
        </>
      )}

      {cfg && tab === 'sev' && (
        <>
          <div className="tblwrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Incident type</th>
                  <th>Description</th>
                  <th>Default severity</th>
                </tr>
              </thead>
              <tbody>
                {cfg.severityMapping.map((m, i) => (
                  <tr key={m.id}>
                    <td>
                      <b>{m.name}</b>
                    </td>
                    <td className="muted">{m.description}</td>
                    <td>
                      <select value={m.defaultSeverity} onChange={(e) => setMapping(i, e.target.value as Severity)} style={{ width: 150 }}>
                        {SEVS.map((s) => (
                          <option key={s} value={s}>
                            {s} · {SEV_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="note blue" style={{ marginTop: 14 }}>
            <span className="ni">i</span>
            <div>Severity is pre-filled from the incident type when reporting. Changes apply to new reports.</div>
          </div>
          <div className="actions" style={{ marginTop: 6 }}>
            <button
              className="btn primary"
              onClick={() =>
                save('severity-mapping', { mapping: cfg.severityMapping.map((m) => ({ id: m.id, defaultSeverity: m.defaultSeverity })) }, 'Severity mapping')
              }
            >
              Save severity mapping
            </button>
          </div>
        </>
      )}

      {cfg && tab === 'gen' && (
        <div className="card pad" style={{ maxWidth: 460 }}>
          <div className="field">
            <label>Re-open window (hours)</label>
            <input
              type="number"
              min={1}
              value={cfg.general.reopenWindowHours}
              onChange={(e) => setCfg({ ...cfg, general: { ...cfg.general, reopenWindowHours: num(e.target.value) } })}
              style={{ width: 120 }}
            />
          </div>
          <div className="field">
            <label>Audit retention (months, min 18)</label>
            <input
              type="number"
              min={18}
              value={cfg.general.retentionMonths}
              onChange={(e) => setCfg({ ...cfg, general: { ...cfg.general, retentionMonths: num(e.target.value) } })}
              style={{ width: 120 }}
            />
          </div>
          <div className="actions">
            <button className="btn primary" onClick={() => save('general', cfg.general, 'General config')}>
              Save general config
            </button>
          </div>
        </div>
      )}
    </>
  );
}
