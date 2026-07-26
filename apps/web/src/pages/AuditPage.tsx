import { useEffect, useState } from 'react';
import { api, getToken } from '../api';
import type { AuditEntry, AuditTrail } from '../types';

function AuditTable({ rows, empty }: { rows: AuditEntry[]; empty: string }) {
  return (
    <div className="tblwrap" style={{ marginBottom: 18 }}>
      <table className="tbl">
        <thead>
          <tr>
            <th>Time</th>
            <th>Who</th>
            <th>Action</th>
            <th>Target</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="mono muted">{new Date(r.at).toLocaleString()}</td>
              <td>
                <b>{r.actorLabel}</b>
              </td>
              <td>{r.action}</td>
              <td className="muted">{r.target}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="muted" style={{ padding: '18px 14px' }}>
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function AuditPage() {
  const [data, setData] = useState<AuditTrail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<AuditTrail>('/audit')
      .then(setData)
      .catch((e) => setErr((e as Error).message));
  }, []);

  async function exportCsv() {
    try {
      const res = await fetch('/api/audit/export.csv', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sentinel-audit.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <>
      <div className="top">
        <div className="crumb">
          <b>IT / Cyber</b>
          <span className="sep">›</span>
          Audit trail
        </div>
        <h2>Audit trail</h2>
        <div className="sub">
          Every user action and configuration change, timestamped. Separate logs for clarity.
          Retained 18 months. Read-only.
        </div>
      </div>

      {err && (
        <div className="note amber">
          <span className="ni">!</span>
          <div>{err}</div>
        </div>
      )}

      {data && (
        <>
          <div className="actions" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn sec sm" onClick={exportCsv}>
              ↓ Export
            </button>
          </div>

          <p className="eyebrow">User actions — report · acknowledge · override · close · re-open</p>
          <AuditTable rows={data.userActions} empty="No user actions recorded yet." />

          <p className="eyebrow">Configuration changes — timeouts · severity mapping · tree edits</p>
          <AuditTable rows={data.configChanges} empty="No configuration changes recorded yet." />
        </>
      )}
    </>
  );
}
