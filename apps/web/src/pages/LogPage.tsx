import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import type { IncidentItem } from '../types';

export default function LogPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<IncidentItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await api<IncidentItem[]>('/incidents'));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function reopen(reference: string) {
    setBusy(reference);
    setErr(null);
    try {
      await api(`/incidents/${reference}/reopen`, { method: 'POST' });
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const isReporter = user?.role === 'REPORTER';
  const canReopen = user?.role === 'ADMIN' || user?.role === 'REPORTER';
  const cols = canReopen ? 9 : 8;

  return (
    <>
      <div className="top">
        <div className="crumb">
          <b>IT / Cyber</b>
          <span className="sep">›</span>
          {isReporter ? 'My reports' : 'Incident log'}
        </div>
        <h2>{isReporter ? 'My reports' : 'Incident log'}</h2>
        <div className="sub">
          {isReporter
            ? "Incidents you've raised and their current status."
            : 'Every incident, timestamped and retained 18 months for audit.'}
        </div>
      </div>

      {err && (
        <div className="note amber">
          <span className="ni">!</span>
          <div>{err}</div>
        </div>
      )}

      <div className="tblwrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>ID</th>
              <th>Time</th>
              <th>Sev</th>
              <th>Type</th>
              <th>Location</th>
              <th>Reporter</th>
              <th>ACK</th>
              <th>Status</th>
              {canReopen && <th></th>}
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.reference}>
                <td>
                  <b className="mono">{i.reference}</b>
                </td>
                <td className="muted">{new Date(i.createdAt).toLocaleString()}</td>
                <td>
                  <span className={`sevtag sev${i.severity[1]}`}>{i.severity}</span>
                </td>
                <td>{i.typeName}</td>
                <td>{i.location}</td>
                <td>{i.reporterLabel}</td>
                <td className="mono">
                  {i.ackCount}/{i.chainSize}
                </td>
                <td>
                  <span className={`statetag ${i.status === 'ACTIVE' ? 'st-active' : 'st-resolved'}`}>
                    {i.status.toLowerCase()}
                  </span>
                </td>
                {canReopen && (
                  <td>
                    {i.status === 'RESOLVED' && (
                      <button
                        className="btn sec sm"
                        disabled={busy === i.reference}
                        onClick={() => reopen(i.reference)}
                      >
                        ↺ Re-open
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {loaded && items.length === 0 && (
              <tr>
                <td colSpan={cols} className="muted" style={{ padding: '20px 14px' }}>
                  No incidents yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
