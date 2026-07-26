import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import type { Role } from '../types';

const items: { to: string; label: string; icon: string; roles: Role[] }[] = [
  { to: '/report', label: 'Report incident', icon: '!', roles: ['ADMIN', 'MEMBER', 'REPORTER'] },
  { to: '/live', label: 'Live tree', icon: '◉', roles: ['ADMIN', 'MEMBER'] },
  { to: '/tree', label: 'Call tree', icon: '⌸', roles: ['ADMIN', 'MEMBER'] },
  { to: '/log', label: 'Incident log', icon: '▤', roles: ['ADMIN', 'MEMBER', 'REPORTER', 'AUDITOR'] },
  { to: '/notifications', label: 'Notifications', icon: '❢', roles: ['ADMIN', 'MEMBER', 'REPORTER', 'AUDITOR'] },
  { to: '/metrics', label: 'Metrics', icon: '▦', roles: ['ADMIN', 'MEMBER', 'AUDITOR'] },
  { to: '/audit', label: 'Audit trail', icon: '✓', roles: ['ADMIN', 'AUDITOR'] },
  { to: '/config', label: 'Configuration', icon: '⚙', roles: ['ADMIN'] },
];

const roleLabel: Record<Role, string> = {
  ADMIN: 'Admin · all access',
  MEMBER: 'Member · in chain',
  REPORTER: 'Reporter · raise & track',
  AUDITOR: 'Auditor · read-only',
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  if (!user) return null;
  const visible = items.filter((i) => i.roles.includes(user.role));

  return (
    <aside className="side">
      <div className="brand">
        <div className="mark">!</div>
        <div>
          <h1>SENTINEL</h1>
          <p>Crisis Console</p>
        </div>
      </div>
      <div className="navlbl">Operations</div>
      <nav className="nav">
        {visible.map((i) => (
          <button
            key={i.to}
            className={loc.pathname === i.to ? 'on' : ''}
            onClick={() => nav(i.to)}
          >
            <span className="ic">{i.icon}</span>{' '}
            {user.role === 'REPORTER' && i.to === '/log' ? 'My reports' : i.label}
          </button>
        ))}
      </nav>
      <div className="rolecard">
        <div className="who">{user.displayName}</div>
        <div className="role">{roleLabel[user.role]}</div>
        <button className="logout" onClick={logout}>
          Log out
        </button>
      </div>
    </aside>
  );
}
