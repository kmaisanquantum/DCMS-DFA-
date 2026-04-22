import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';

const NAV = [
  { to: '/dashboard',     icon: '▦',  label: 'Dashboard' },
  { to: '/requests/new',  icon: '+',  label: 'New Request' },
];

export default function Layout() {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      {/* Top Navigation Bar */}
      <header style={{
        height: 64, background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'sticky', top: 0, zIndex: 100,
        padding: '0 20px',
      }}>
        <div style={{
          width: '100%', maxWidth: 1200,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'linear-gradient(135deg,#16a34a,#0ea5e9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, flexShrink: 0,
            }}>🇵🇬</div>
            <div className="hide-mobile">
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>DCMS</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>PNG · DFA</div>
            </div>
            <div className="show-mobile" style={{ fontWeight: 700, fontSize: 16 }}>DCMS</div>
          </div>

          {/* Desktop Nav */}
          <nav style={{ display: 'flex', gap: 8 }} className="hide-mobile">
            {NAV.map(({ to, icon, label }) => (
              <NavLink key={to} to={to} style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                fontSize: 14, fontWeight: 600,
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                background: isActive ? 'var(--bg-elevated)' : 'transparent',
                transition: 'all .15s',
              })}>
                <span style={{ fontSize: 16, opacity: 0.8 }}>{icon}</span>
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            className="show-mobile"
            onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
            style={{
              background: 'none', border: 'none', color: 'var(--text-primary)',
              fontSize: 24, padding: 8, cursor: 'pointer'
            }}
          >
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div style={{
          position: 'fixed', top: 64, left: 0, right: 0, bottom: 0,
          background: 'var(--bg-surface)', zIndex: 90,
          display: 'flex', flexDirection: 'column', padding: '20px'
        }} className="show-mobile">
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {NAV.map(({ to, icon, label }) => (
              <NavLink key={to} to={to} style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                fontSize: 16, fontWeight: 600,
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                background: isActive ? 'var(--bg-elevated)' : 'transparent',
              })}>
                <span style={{ fontSize: 20 }}>{icon}</span>
                {label}
              </NavLink>
            ))}
          </nav>

          <div style={{ marginTop: 'auto', padding: '20px 0', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-subtle)' }}>
            <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text-muted)' }}>DCMS · CLASSIFIED SYSTEM</div>
            <div>v1.0.0 · Department of Foreign Affairs</div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main style={{
        flex: 1, background: 'var(--bg-base)',
        paddingBottom: 40,
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Outlet />
        </div>
      </main>

      <style>{`
        .hide-mobile { display: flex; }
        .show-mobile { display: none; }

        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
