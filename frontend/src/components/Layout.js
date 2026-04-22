import { Outlet, NavLink, useLocation } from 'react-router-dom';

const NAV = [
  { to: '/dashboard',     icon: '▦',  label: 'Dashboard' },
  { to: '/requests/new',  icon: '+',  label: 'New Request' },
];

export default function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'linear-gradient(135deg,#16a34a,#0ea5e9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, flexShrink: 0,
            }}>🇵🇬</div>
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>DCMS</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>PNG · DFA</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px 8px', flex: 1 }}>
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 'var(--radius-sm)',
              marginBottom: 2, textDecoration: 'none',
              fontSize: 13, fontWeight: 500,
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              background: isActive ? 'var(--bg-elevated)' : 'transparent',
              transition: 'all .15s',
            })}
            onMouseEnter={e => { if (!e.currentTarget.classList.contains('active')) e.currentTarget.style.background = 'rgba(255,255,255,.04)'; }}
            onMouseLeave={e => { if (!e.currentTarget.classList.contains('active')) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ width: 18, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 14 }}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text-subtle)' }}>
          <div style={{ fontWeight: 700, marginBottom: 2, color: 'var(--text-muted)' }}>CLASSIFIED SYSTEM</div>
          <div>Restricted to authorised</div>
          <div>DFA personnel only</div>
          <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)' }}>v1.0.0</div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-base)' }}>
        <Outlet />
      </main>
    </div>
  );
}
