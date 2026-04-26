
// ── StatusPill ────────────────────────────────────────────────
export function StatusPill({ status, overdue }) {
  const map = {
    DRAFT:             { label: 'Draft',              color: '#64748b', bg: 'rgba(100,116,139,.15)' },
    SUBMITTED:         { label: 'Submitted',           color: '#60a5fa', bg: 'rgba(59,130,246,.12)' },
    UNDER_REVIEW:      { label: '⏳ Under Review',     color: '#fbbf24', bg: 'rgba(234,179,8,.12)' },
    ALL_APPROVED:      { label: '✓ All Approved',      color: '#4ade80', bg: 'rgba(34,197,94,.12)' },
    CLEARANCE_ISSUED:  { label: '✓ Issued',            color: '#4ade80', bg: 'rgba(34,197,94,.12)' },
    REJECTED:          { label: '✕ Rejected',          color: '#f87171', bg: 'rgba(239,68,68,.12)' },
    WITHDRAWN:         { label: 'Withdrawn',           color: '#64748b', bg: 'rgba(100,116,139,.15)' },
    EXPIRED:           { label: 'Expired',             color: '#f87171', bg: 'rgba(239,68,68,.12)' },
  };
  if (overdue) return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 10px',
      borderRadius:999, fontSize:11, fontWeight:700,
      color:'#f87171', background:'rgba(239,68,68,.12)',
      border:'1px solid rgba(239,68,68,.2)' }}>⚠ Overdue</span>
  );
  const s = map[status] || { label: status, color: '#94a3b8', bg: 'rgba(148,163,184,.1)' };
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 10px',
      borderRadius:999, fontSize:11, fontWeight:700,
      color: s.color, background: s.bg,
      border:`1px solid ${s.color}30` }}>{s.label}</span>
  );
}

// ── ReviewPill ────────────────────────────────────────────────
export function ReviewPill({ status }) {
  const map = {
    PENDING:               { label: 'Pending',        color: '#fbbf24', bg: 'rgba(234,179,8,.12)' },
    APPROVED:              { label: '✓ Approved',     color: '#4ade80', bg: 'rgba(34,197,94,.12)' },
    REJECTED:              { label: '✕ Rejected',     color: '#f87171', bg: 'rgba(239,68,68,.12)' },
    INFORMATION_REQUESTED: { label: 'Info Needed',    color: '#60a5fa', bg: 'rgba(59,130,246,.12)' },
  };
  const s = map[status] || { label: status, color: '#94a3b8', bg: 'transparent' };
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 9px',
      borderRadius:999, fontSize:11, fontWeight:700,
      color: s.color, background: s.bg }}>{s.label}</span>
  );
}

// ── ProgressBar ───────────────────────────────────────────────
export function ProgressBar({ approved, total, rejected }) {
  const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
  const color = rejected > 0 ? '#ef4444' : approved === total ? '#22c55e' : '#eab308';
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
        <span style={{ color:'#64748b' }}>{approved}/{total} approved</span>
        <span style={{ color, fontWeight:700 }}>{pct}%</span>
      </div>
      <div style={{ height:5, background:'#1e293b', borderRadius:99 }}>
        <div style={{ height:'100%', width:`${pct}%`, background:color,
          borderRadius:99, transition:'width .5s' }} />
      </div>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────
export function Card({ children, style }) {
  return (
    <div style={{
      background:'var(--bg-surface)', border:'1px solid var(--border)',
      borderRadius:'var(--radius-lg)', padding:20, ...style
    }}>{children}</div>
  );
}

// ── PageHeader ────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ padding:'24px 20px 0' }} className="page-header-container">
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-serif)', fontSize:26, fontWeight:700,
            color:'var(--text-primary)', lineHeight:1.2 }}>{title}</h1>
          {subtitle && <p style={{ color:'var(--text-muted)', fontSize:13, marginTop:4 }}>{subtitle}</p>}
        </div>
        {action && <div style={{ minWidth: 'fit-content' }}>{action}</div>}
      </div>
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────
export function StatCard({ label, value, color = 'var(--text-primary)', icon }) {
  return (
    <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border)',
      borderRadius:'var(--radius-lg)', padding:'16px 20px', flex: '1 1 200px' }}>
      <div style={{ fontSize:11, color:'var(--text-muted)', letterSpacing:'0.1em',
        textTransform:'uppercase', fontWeight:700, marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:900, color,
        fontFamily:'var(--font-serif)', display:'flex', alignItems:'center', gap:8 }}>
        {icon && <span style={{ fontSize:20 }}>{icon}</span>}{value}
      </div>
    </div>
  );
}

// ── Button ────────────────────────────────────────────────────
export function Button({ children, onClick, disabled, variant = 'primary', style, type = 'button' }) {
  const variants = {
    primary:   { background:'linear-gradient(135deg,#0ea5e9,#0284c7)', color:'#fff', border:'none',
                 boxShadow:'0 4px 20px rgba(14,165,233,.3)' },
    success:   { background:'linear-gradient(135deg,#16a34a,#15803d)', color:'#fff', border:'none',
                 boxShadow:'0 4px 20px rgba(22,163,74,.3)' },
    danger:    { background:'linear-gradient(135deg,#dc2626,#b91c1c)', color:'#fff', border:'none' },
    secondary: { background:'var(--bg-elevated)', color:'var(--text-secondary)',
                 border:'1px solid var(--border-light)' },
    ghost:     { background:'transparent', color:'var(--text-muted)', border:'1px solid var(--border)' },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      ...variants[variant],
      padding:'10px 18px', borderRadius:'var(--radius-md)',
      fontSize:13, fontWeight:700, cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1, transition:'all .2s',
      display:'inline-flex', alignItems:'center', justifyContent: 'center', gap:6, ...style,
    }}>{children}</button>
  );
}

// ── Input ─────────────────────────────────────────────────────
export function Input({ label, ...props }) {
  return (
    <label style={{ display:'flex', flexDirection:'column', gap:4, width: '100%' }}>
      {label && <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700,
        textTransform:'uppercase', letterSpacing:'0.1em' }}>{label}</span>}
      <input {...props} style={{
        background:'var(--bg-elevated)', border:'1px solid var(--border-light)',
        borderRadius:'var(--radius-sm)', padding:'9px 12px',
        color:'var(--text-primary)', fontSize:13, outline:'none', width:'100%',
        ...props.style,
      }} />
    </label>
  );
}

// ── Select ────────────────────────────────────────────────────
export function Select({ label, children, ...props }) {
  return (
    <label style={{ display:'flex', flexDirection:'column', gap:4, width: '100%' }}>
      {label && <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700,
        textTransform:'uppercase', letterSpacing:'0.1em' }}>{label}</span>}
      <select {...props} style={{
        background:'var(--bg-elevated)', border:'1px solid var(--border-light)',
        borderRadius:'var(--radius-sm)', padding:'9px 12px',
        color:'var(--text-primary)', fontSize:13, outline:'none', width:'100%',
        ...props.style,
      }}>{children}</select>
    </label>
  );
}

// ── Spinner ───────────────────────────────────────────────────
export function Spinner({ size = 32 }) {
  return (
    <div style={{ width:size, height:size, border:'3px solid var(--bg-elevated)',
      borderTopColor:'var(--blue)', borderRadius:'50%',
      animation:'spin .8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────────
export function EmptyState({ icon = '📋', title, body }) {
  return (
    <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text-muted)' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>{icon}</div>
      <div style={{ fontSize:16, fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>{title}</div>
      {body && <div style={{ fontSize:13 }}>{body}</div>}
    </div>
  );
}
