import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import CallTreePage from './pages/CallTreePage';
import LiveTreePage from './pages/LiveTreePage';
import ReportPage from './pages/ReportPage';
import LogPage from './pages/LogPage';
import MetricsPage from './pages/MetricsPage';
import AuditPage from './pages/AuditPage';
import ConfigPage from './pages/ConfigPage';
import NotificationsPage from './pages/NotificationsPage';
import type { Role } from './types';

const canReport = (r: Role) => r !== 'AUDITOR';
const canTree = (r: Role) => r === 'ADMIN' || r === 'MEMBER';
const canMetrics = (r: Role) => r !== 'REPORTER';
const canAudit = (r: Role) => r === 'ADMIN' || r === 'AUDITOR';
const canConfig = (r: Role) => r === 'ADMIN';

export default function App() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: '#647085' }}>
        Loading…
      </div>
    );
  }
  if (!user) return <LoginPage />;

  const home = canReport(user.role) ? '/report' : '/log';
  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <Routes>
          <Route path="/" element={<Navigate to={home} replace />} />
          {canReport(user.role) && <Route path="/report" element={<ReportPage />} />}
          {canTree(user.role) && <Route path="/live" element={<LiveTreePage />} />}
          {canTree(user.role) && <Route path="/tree" element={<CallTreePage />} />}
          <Route path="/log" element={<LogPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          {canMetrics(user.role) && <Route path="/metrics" element={<MetricsPage />} />}
          {canAudit(user.role) && <Route path="/audit" element={<AuditPage />} />}
          {canConfig(user.role) && <Route path="/config" element={<ConfigPage />} />}
          <Route path="*" element={<Navigate to={home} replace />} />
        </Routes>
      </main>
    </div>
  );
}
