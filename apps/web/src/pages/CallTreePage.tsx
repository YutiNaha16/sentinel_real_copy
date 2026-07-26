import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { api, getToken } from '../api';
import { useAuth } from '../auth';
import type { TreeNodeView, TreeResponse } from '../types';

function NodeCard({ n, me }: { n: TreeNodeView; me?: boolean }) {
  return (
    <div className={`tcard ${me ? 'me' : ''}`}>
      <div className="av">{n.displayName[0]}</div>
      <div className="who2">
        <b>{n.displayName}</b>
        <div className="role">{n.title}</div>
      </div>
      <div className="contact">
        {n.email}
        <br />
        {n.phone}
      </div>
    </div>
  );
}

const EMPTY = { displayName: '', title: '', email: '', phone: '', backupId: '' };

export default function CallTreePage() {
  const { user } = useAuth();
  const [data, setData] = useState<TreeResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [modal, setModal] = useState<'add' | { edit: TreeNodeView } | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [act, setAct] = useState(false);
  const [actScope, setActScope] = useState<'whole' | 'down' | 'up'>('whole');
  const [actMsg, setActMsg] = useState('');
  const [actBusy, setActBusy] = useState(false);
  const [actResult, setActResult] = useState<{
    count: number;
    reached: { name: string; delivered: boolean; error?: string }[];
  } | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api<TreeResponse>('/trees/it-cyber'));
    } catch (e) {
      setErr((e as Error).message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const nodes = data?.scope === 'full' ? data.nodes : [];

  function openAdd() {
    setForm(EMPTY);
    setErr(null);
    setModal('add');
  }
  function openEdit(n: TreeNodeView) {
    setForm({ displayName: n.displayName, title: n.title, email: n.email, phone: n.phone, backupId: n.backupId ?? '' });
    setErr(null);
    setModal({ edit: n });
  }

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      if (modal === 'add') {
        setData(await api<TreeResponse>('/trees/it-cyber/nodes', { method: 'POST', body: form }));
      } else if (modal && 'edit' in modal) {
        setData(await api<TreeResponse>(`/trees/it-cyber/nodes/${modal.edit.id}`, { method: 'PATCH', body: form }));
      }
      setModal(null);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(n: TreeNodeView) {
    if (!window.confirm(`Remove ${n.displayName} from the chain?`)) return;
    setErr(null);
    try {
      setData(await api<TreeResponse>(`/trees/it-cyber/nodes/${n.id}`, { method: 'DELETE' }));
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  async function move(id: string, direction: 'up' | 'down') {
    try {
      setData(await api<TreeResponse>(`/trees/it-cyber/nodes/${id}/move`, { method: 'POST', body: { direction } }));
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function onUpload(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setErr(null);
    try {
      const text = await f.text();
      setData(await api<TreeResponse>('/trees/it-cyber/upload', { method: 'POST', body: { csv: text } }));
    } catch (err) {
      setErr((err as Error).message);
    }
  }

  async function download(path: string, filename: string) {
    try {
      const res = await fetch(`/api${path}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  function openActivate() {
    setActScope(isMember ? 'down' : 'whole');
    setActMsg('');
    setActResult(null);
    setErr(null);
    setAct(true);
  }
  async function sendActivation() {
    setActBusy(true);
    setErr(null);
    setActResult(null);
    try {
      const r = await api<{ count: number; reached: { name: string; delivered: boolean; error?: string }[] }>(
        '/trees/it-cyber/activate',
        { method: 'POST', body: { scope: actScope, message: actMsg } },
      );
      setActResult({ count: r.count, reached: r.reached });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setActBusy(false);
    }
  }

  const isMember = user?.role === 'MEMBER';
  return (
    <>
      <div className="top">
        <div className="crumb">
          <b>IT / Cyber</b>
          <span className="sep">›</span>
          {isMember ? 'My call tree' : 'Full call tree'}
        </div>
        <h2>{isMember ? 'My call tree' : 'Full call tree — IT / Cyber'}</h2>
        <div className="sub">
          {isMember
            ? 'You see only your slice — the person above you, your backup, and who reports to you. Contact privacy by design.'
            : 'The complete escalation chain, in order. Add, edit, remove, or reorder people — every change is audit-logged.'}
        </div>
      </div>

      {err && (
        <div className="note amber">
          <span className="ni">!</span>
          <div>{err}</div>
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <button className="btn danger" onClick={openActivate}>
          🚨 Initiate call tree
        </button>
        <span className="muted" style={{ marginLeft: 10, fontSize: 12 }}>
          Broadcast a crisis alert to a whole group at once (separate from incident escalation).
        </span>
      </div>

      {data?.scope === 'full' && (
        <>
          <div className="actions" style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <button className="btn primary" onClick={openAdd}>
              + Add person
            </button>
            <button className="btn sec sm" onClick={() => download('/trees/it-cyber/export.csv', 'it-cyber-matrix.csv')}>
              ↓ Export matrix
            </button>
            <button className="btn sec sm" onClick={() => download('/trees/it-cyber/template.csv', 'it-cyber-template.csv')}>
              ↓ Sample template
            </button>
            <label className="btn ghost sm" style={{ cursor: 'pointer' }}>
              ↑ Upload CSV
              <input type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={onUpload} />
            </label>
          </div>
          <div className="tblwrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Backup</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {nodes.map((n, i) => (
                  <tr key={n.id}>
                    <td>
                      <span className="tag">{n.order}</span>
                    </td>
                    <td>
                      <b>{n.displayName}</b>
                    </td>
                    <td className="muted">{n.title}</td>
                    <td className="mono" style={{ fontSize: 11.5 }}>
                      {n.email}
                    </td>
                    <td className="mono" style={{ fontSize: 11.5 }}>
                      {n.phone}
                    </td>
                    <td className="muted">{n.backupName ?? '—'}</td>
                    <td>
                      <div className="inline" style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        <button className="btn sec sm" onClick={() => openEdit(n)}>
                          Edit
                        </button>
                        <button className="btn sec sm" disabled={i === 0} onClick={() => move(n.id, 'up')}>
                          ↑
                        </button>
                        <button className="btn sec sm" disabled={i === nodes.length - 1} onClick={() => move(n.id, 'down')}>
                          ↓
                        </button>
                        <button className="btn danger sm" onClick={() => remove(n)}>
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="note blue" style={{ marginTop: 14 }}>
            <span className="ni">i</span>
            <div>
              Order defines who is alerted first. Sequential levels (L0/L1) contact people in this order; parallel
              levels (L2/L3) alert everyone at once. Fields map to LDAP attributes for Phase-2 directory sync.
            </div>
          </div>
        </>
      )}

      {data?.scope === 'member' && (
        <div className="card pad">
          {data.view.parent && (
            <>
              <p className="eyebrow">Escalates up to</p>
              <NodeCard n={data.view.parent} />
            </>
          )}
          <p className="eyebrow" style={{ marginTop: 14 }}>
            You
          </p>
          <NodeCard n={data.view.self} me />
          {data.view.backup && (
            <>
              <p className="eyebrow" style={{ marginTop: 14 }}>
                Your backup
              </p>
              <NodeCard n={data.view.backup} />
            </>
          )}
          {data.view.reports.length > 0 && (
            <>
              <p className="eyebrow" style={{ marginTop: 14 }}>
                Reports to you
              </p>
              {data.view.reports.map((r) => (
                <NodeCard key={r.id} n={r} />
              ))}
            </>
          )}
          <div className="note blue" style={{ marginTop: 16 }}>
            <span className="ni">i</span>
            <div>You see only the people directly relevant to you — never the whole organisation.</div>
          </div>
        </div>
      )}

      {modal && (
        <div className="modalback" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="mhead">
              <h3>{modal === 'add' ? 'Add person' : `Edit ${modal.edit.displayName}`}</h3>
              <button className="x" onClick={() => setModal(null)}>
                ×
              </button>
            </div>
            <div className="mbody">
              <div className="field">
                <label>Full name</label>
                <input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="e.g. Priya Sharma" />
              </div>
              <div className="field">
                <label>Role / title</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Security Analyst" />
              </div>
              <div className="grid2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label>Email</label>
                  <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@sodexo.com" />
                </div>
                <div className="field">
                  <label>Phone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 ..." />
                </div>
              </div>
              <div className="field">
                <label>Backup (covers if no ACK)</label>
                <select value={form.backupId} onChange={(e) => setForm({ ...form, backupId: e.target.value })}>
                  <option value="">— none —</option>
                  {nodes
                    .filter((n) => !(modal !== 'add' && n.id === modal.edit.id))
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.displayName}
                      </option>
                    ))}
                </select>
              </div>
              <div className="note blue">
                <span className="ni">i</span>
                <div>Fields map to LDAP attributes (name→displayName, email→mail, role→title) so Phase-2 directory sync drops in cleanly.</div>
              </div>
            </div>
            <div className="mfoot">
              <button className="btn sec" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button className="btn primary" disabled={busy} onClick={save}>
                {modal === 'add' ? 'Add person' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {act && (
        <div className="modalback" onClick={() => setAct(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="mhead">
              <h3>🚨 Initiate call tree</h3>
              <button className="x" onClick={() => setAct(false)}>
                ×
              </button>
            </div>
            <div className="mbody">
              <div className="note amber">
                <span className="ni">!</span>
                <div>
                  This immediately broadcasts your message to a whole group <b>at once</b> (plus each person's backup) —
                  separate from normal one-by-one incident escalation. Use it for a major crisis.
                </div>
              </div>
              <div className="field">
                <label>Who to alert</label>
                <select value={actScope} onChange={(e) => setActScope(e.target.value as 'whole' | 'down' | 'up')}>
                  <option value="whole">Whole tree — everyone</option>
                  <option value="down">Everyone below me</option>
                  <option value="up">Everyone above me</option>
                </select>
              </div>
              <div className="field">
                <label>Message</label>
                <textarea
                  value={actMsg}
                  rows={4}
                  onChange={(e) => setActMsg(e.target.value)}
                  placeholder="e.g. Major security incident in progress — activate crisis response now."
                />
              </div>
              {actResult && (
                <div className="note blue">
                  <span className="ni">i</span>
                  <div>
                    Broadcast sent to {actResult.count} {actResult.count === 1 ? 'person' : 'people'}:
                    <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                      {actResult.reached.map((r, i) => (
                        <li key={i}>
                          {r.name} — {r.delivered ? '✓ sent' : `✗ ${r.error || 'failed'}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
            <div className="mfoot">
              <button className="btn sec" onClick={() => setAct(false)}>
                Close
              </button>
              <button className="btn danger" disabled={actBusy || !actMsg.trim()} onClick={sendActivation}>
                {actBusy ? 'Sending…' : 'Send alert'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
