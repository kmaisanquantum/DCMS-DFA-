import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';

const NAV = [
  { to: '/dashboard',     icon: '▦',  label: 'Dashboard' },
  { to: '/requests/new',  icon: '+',  label: 'New Request' },
];

export default function Layout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      {/* Mobile Header */}
      <header style={{
        height: 60, background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', position: 'sticky', top: 0, zIndex: 50,
      }} className="show-mobile">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 6,
            background: 'linear-gradient(135deg,#16a34a,#0ea5e9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>🇵🇬</div>
          <span style={{ fontWeight: 700, fontSize: 14 }}>DCMS</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          style={{
            background: 'none', border: 'none', color: 'var(--text-primary)',
            fontSize: 24, padding: 4, cursor: 'pointer'
          }}
        >
          {isSidebarOpen ? '✕' : '☰'}
        </button>
      </header>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar */}
        <aside style={{
          width: 220, background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          position: 'fixed', top: 0, bottom: 0, left: 0,
          zIndex: 100, transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease-in-out',
        }} className="sidebar-container">
          {/* Desktop Logo (Hidden on mobile) */}
          <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }} className="hide-mobile">
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

          {/* Mobile Sidebar Logo */}
          <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }} className="show-mobile">
             <div style={{ fontWeight: 700 }}>Menu</div>
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
              })}>
                <span style={{ width: 18, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 14 }}>{icon}</span>
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text-subtle)' }}>
            <div style={{ fontWeight: 700, marginBottom: 2, color: 'var(--text-muted)' }}>CLASSIFIED SYSTEM</div>
            <div>v1.0.0</div>
          </div>
        </aside>

        {/* Sidebar Overlay (Mobile) */}
        {isSidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90
            }}
          />
        )}

        {/* Main content */}
        <main style={{
          flex: 1, overflowY: 'auto', background: 'var(--bg-base)',
          marginLeft: 0, // Default for mobile
          paddingBottom: 40,
        }} className="main-content">
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (min-width: 769px) {
          .sidebar-container {
            transform: none !important;
            position: sticky !important;
            height: 100vh !important;
          }
          .main-content {
            margin-left: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
