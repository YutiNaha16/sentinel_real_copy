import { useState } from 'react';
import { useAuth } from '../auth';

const TEST = [
  { label: 'Admin', email: 'admin@sentinel.local' },
  { label: 'Member', email: 'prashant@sentinel.local' },
  { label: 'Reporter', email: 'reporter@sentinel.local' },
  { label: 'Auditor', email: 'auditor@sentinel.local' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(em: string, pw: string) {
    setErr(null);
    setBusy(true);
    try {
      await login(em, pw);
    } catch (ex) {
      setErr((ex as Error).message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="card pad login-card">
        <div className="login-brand">
          <div className="mark">!</div>
          <h1>SENTINEL</h1>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(email, password);
          }}
        >
          <div className="field">
            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@sodexo.com" autoFocus />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {err && <div className="err">{err}</div>}
          <button className="btn primary big block" disabled={busy} type="submit" style={{ marginTop: 6 }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="eyebrow" style={{ marginTop: 18 }}>
          Demo · quick sign-in
        </p>
        <div className="quick">
          {TEST.map((t) => (
            <button key={t.email} disabled={busy} onClick={() => run(t.email, 'Passw0rd!')}>
              {t.label}
            </button>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 11, marginTop: 10 }}>
          Pilot test accounts · password <span className="mono">Passw0rd!</span>
        </p>
      </div>
    </div>
  );
}
