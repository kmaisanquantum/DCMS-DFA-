import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchRequests } from '../utils/api';
import { fmt, isOverdue } from '../utils/helpers';
import { StatusPill, ProgressBar, StatCard, PageHeader, Button, Spinner, EmptyState } from '../components/UI';

const FILTERS = [
  { id: 'ALL',              label: 'All Requests' },
  { id: 'UNDER_REVIEW',    label: 'Pending' },
  { id: 'OVERDUE',         label: 'Overdue' },
  { id: 'ALL_APPROVED',    label: 'Ready' },
  { id: 'CLEARANCE_ISSUED',label: 'Issued' },
];

export default function DashboardPage() {
  const [filter, setFilter]   = useState('ALL');
  const [search, setSearch]   = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['requests'],
    queryFn: () => fetchRequests({ limit: 100 }),
    refetchInterval: 30000,
  });

  const requests = data?.requests || [];

  const stats = {
    total:   requests.length,
    pending: requests.filter(r => ['UNDER_REVIEW','SUBMITTED'].includes(r.status)).length,
    overdue: requests.filter(isOverdue).length,
    issued:  requests.filter(r => r.status === 'CLEARANCE_ISSUED').length,
  };

  const filtered = requests.filter(r => {
    const matchFilter =
      filter === 'ALL'           ? true :
      filter === 'OVERDUE'       ? isOverdue(r) :
      r.status === filter;

    const q = search.toLowerCase();
    const matchSearch = !q || [r.reference_number, r.vessel_name, r.mission_name, r.country_name]
      .some(s => s?.toLowerCase().includes(q));

    return matchFilter && matchSearch;
  });

  return (
    <div style={{ padding: '16px 0' }} className="container">
      <PageHeader
        title="Clearance Requests"
        subtitle="Status overview of diplomatic applications"
        action={
          <Link to="/requests/new">
            <Button variant="primary" style={{ width: '100%' }}>+ New Request</Button>
          </Link>
        }
      />

      {/* Stats */}
      <div style={{ display:'flex', gap:14, marginBottom:28, flexWrap:'wrap', padding: '0 20px' }}>
        <StatCard label="Total"    value={stats.total}   icon="📋" />
        <StatCard label="Pending"  value={stats.pending} icon="⏳" color="var(--yellow-text)" />
        <StatCard label="Overdue"  value={stats.overdue} icon="🔴" color="var(--red-text)" />
        <StatCard label="Issued"   value={stats.issued}  icon="✅" color="var(--green-text)" />
      </div>

      {/* Toolbar */}
      <div style={{ padding: '0 20px', marginBottom: 20 }}>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {FILTERS.map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                padding:'6px 12px', borderRadius:999, fontSize:11, fontWeight:700,
                border:'1px solid', cursor:'pointer', transition:'all .15s',
                borderColor: filter === f.id ? 'var(--blue)' : 'var(--border)',
                background: filter === f.id ? 'var(--blue-dim)' : 'transparent',
                color: filter === f.id ? 'var(--blue-text)' : 'var(--text-muted)',
              }}>{f.label}</button>
            ))}
          </div>
          <input
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background:'var(--bg-surface)', border:'1px solid var(--border)',
              borderRadius:'var(--radius-sm)', padding:'7px 14px',
              color:'var(--text-primary)', fontSize:13, outline:'none', width: '100%', maxWidth: 280,
              marginTop: 10
            }}
            className="mobile-search-input"
          />
        </div>
      </div>

      {/* Requests List */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>

          {/* Desktop Header */}
          <div className="hide-mobile" style={{
            display:'grid',
            gridTemplateColumns:'1fr 1.5fr 1.5fr 100px 120px 100px',
            padding:'12px 20px', background:'var(--bg-base)',
            fontSize:10, color:'var(--text-muted)', letterSpacing:'0.12em',
            textTransform:'uppercase', fontWeight:700,
            borderBottom:'1px solid var(--border)',
          }}>
            <span>Reference</span>
            <span>Mission</span>
            <span>Vessel</span>
            <span>Entry</span>
            <span>Progress</span>
            <span>Status</span>
          </div>

          {isLoading && <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner /></div>}
          {error && <div style={{ padding:20, color:'var(--red-text)', textAlign:'center' }}>Error: {error.message}</div>}
          {!isLoading && filtered.length === 0 && <EmptyState icon="📋" title="No requests found" />}

          {filtered.map(r => {
            const over = isOverdue(r);
            const borderColor = ['CLEARANCE_ISSUED','ALL_APPROVED'].includes(r.status) ? 'var(--green)' : over ? 'var(--red)' : 'var(--yellow)';
            const bgColor     = ['CLEARANCE_ISSUED','ALL_APPROVED'].includes(r.status) ? 'var(--green-dim)' : over ? 'var(--red-dim)' : 'var(--yellow-dim)';

            return (
              <Link key={r.request_id} to={`/requests/${r.request_id}`} className="request-item" style={{
                display:'grid',
                padding:'14px 20px',
                borderBottom:'1px solid var(--border)',
                borderLeft:`4px solid ${borderColor}`,
                background: bgColor,
                textDecoration:'none', color:'inherit',
                transition:'background .15s',
                alignItems:'center',
              }}>
                <div className="request-grid-layout">
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--blue-text)', fontWeight:700 }}>{r.reference_number}</span>

                  <div className="mission-info">
                    <div style={{ fontWeight:600, color:'var(--text-primary)', fontSize:13 }}>{r.mission_name}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>{r.country_name}</div>
                  </div>

                  <div className="vessel-info">
                    <div style={{ fontWeight:600, color:'var(--text-secondary)', fontSize:13 }}>{r.vessel_name}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>{r.vessel_type?.replace(/_/g,' ')}</div>
                  </div>

                  <span className="entry-date" style={{ fontSize:12, color:'var(--text-secondary)' }}>{fmt(r.proposed_entry_date)}</span>

                  <div className="progress-bar-container">
                    <ProgressBar approved={parseInt(r.approved_count)||0} total={parseInt(r.total_mandatory)||5} rejected={parseInt(r.rejected_count)||0} />
                  </div>

                  <div className="status-container">
                    <StatusPill status={r.status} overdue={over} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <style>{`
        .request-grid-layout {
          display: grid;
          grid-template-columns: 1fr 1.5fr 1.5fr 100px 120px 100px;
          gap: 12px;
          align-items: center;
          width: 100%;
        }

        @media (max-width: 768px) {
          .request-grid-layout {
            grid-template-columns: 1fr 1fr;
            grid-template-areas:
              "ref status"
              "mission vessel"
              "progress progress"
              "date date";
            gap: 16px;
          }

          .request-grid-layout > span:first-child { grid-area: ref; }
          .status-container { grid-area: status; text-align: right; }
          .mission-info { grid-area: mission; }
          .vessel-info { grid-area: vessel; text-align: right; }
          .progress-bar-container { grid-area: progress; }
          .entry-date { grid-area: date; font-size: 11px !important; }

          .mobile-search-input {
            max-width: none !important;
          }
        }
      `}</style>
    </div>
  );
}
