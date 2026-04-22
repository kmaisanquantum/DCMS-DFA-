import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchRequests } from '../utils/api';
import { fmt, isOverdue } from '../utils/helpers';
import { StatusPill, ProgressBar, StatCard, PageHeader, Button, Spinner, EmptyState } from '../components/UI';

const FILTERS = [
  { id: 'ALL',              label: 'All Requests' },
  { id: 'UNDER_REVIEW',    label: '⏳ Pending' },
  { id: 'OVERDUE',         label: '🔴 Overdue' },
  { id: 'ALL_APPROVED',    label: '✅ Ready to Issue' },
  { id: 'CLEARANCE_ISSUED',label: '📄 Issued' },
  { id: 'REJECTED',        label: '✕ Rejected' },
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
    <div style={{ padding:'24px 28px' }}>
      <PageHeader
        title="Clearance Requests"
        subtitle="Status overview of all diplomatic clearance applications"
        action={
          <Link to="/requests/new">
            <Button variant="primary">+ New Request</Button>
          </Link>
        }
      />

      {/* Stats */}
      <div style={{ display:'flex', gap:14, marginBottom:28, flexWrap:'wrap' }}>
        <StatCard label="Total"    value={stats.total}   icon="📋" />
        <StatCard label="Pending"  value={stats.pending} icon="⏳" color="var(--yellow-text)" />
        <StatCard label="Overdue"  value={stats.overdue} icon="🔴" color="var(--red-text)" />
        <StatCard label="Issued"   value={stats.issued}  icon="✅" color="var(--green-text)" />
      </div>

      {/* Toolbar */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap',
        alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding:'6px 14px', borderRadius:999, fontSize:12, fontWeight:700,
              border:'1px solid', cursor:'pointer', transition:'all .15s',
              borderColor: filter === f.id ? 'var(--blue)' : 'var(--border)',
              background: filter === f.id ? 'var(--blue-dim)' : 'transparent',
              color: filter === f.id ? 'var(--blue-text)' : 'var(--text-muted)',
            }}>{f.label}</button>
          ))}
        </div>
        <input
          placeholder="Search vessel, mission, reference…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            background:'var(--bg-surface)', border:'1px solid var(--border)',
            borderRadius:'var(--radius-sm)', padding:'7px 14px',
            color:'var(--text-primary)', fontSize:13, outline:'none', width:280,
          }}
        />
      </div>

      {/* Table */}
      <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border)',
        borderRadius:'var(--radius-lg)', overflow:'hidden' }}>

        {/* Header row */}
        <div style={{
          display:'grid',
          gridTemplateColumns:'1.2fr 1.6fr 1.4fr 100px 130px 120px',
          padding:'10px 20px', background:'var(--bg-base)',
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

        {isLoading && (
          <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
            <Spinner />
          </div>
        )}

        {error && (
          <div style={{ padding:20, color:'var(--red-text)', textAlign:'center' }}>
            Failed to load requests: {error.message}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <EmptyState icon="📋" title="No requests found" body="Adjust your filter or submit a new request." />
        )}

        {filtered.map(r => {
          const over = isOverdue(r);
          const borderColor = ['CLEARANCE_ISSUED','ALL_APPROVED'].includes(r.status) ? 'var(--green)'
                            : over ? 'var(--red)' : 'var(--yellow)';
          const bgColor     = ['CLEARANCE_ISSUED','ALL_APPROVED'].includes(r.status) ? 'var(--green-dim)'
                            : over ? 'var(--red-dim)' : 'var(--yellow-dim)';
          return (
            <Link
              key={r.request_id}
              to={`/requests/${r.request_id}`}
              style={{
                display:'grid',
                gridTemplateColumns:'1.2fr 1.6fr 1.4fr 100px 130px 120px',
                padding:'14px 20px',
                borderBottom:'1px solid var(--border)',
                borderLeft:`3px solid ${borderColor}`,
                background: bgColor,
                textDecoration:'none', color:'inherit',
                transition:'background .15s',
                alignItems:'center',
              }}
            >
              <span style={{ fontFamily:'var(--font-mono)', fontSize:12,
                color:'var(--blue-text)', fontWeight:700 }}>{r.reference_number}</span>

              <div>
                <div style={{ fontWeight:600, color:'var(--text-primary)', fontSize:13 }}>
                  {r.mission_name}
                </div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>{r.country_name}</div>
              </div>

              <div>
                <div style={{ fontWeight:600, color:'var(--text-secondary)', fontSize:13 }}>
                  {r.vessel_name}
                </div>
                <div style={{ fontSize:11, color:'var(--text-muted)', display:'flex', gap:6 }}>
                  {r.vessel_type?.replace(/_/g,' ')}
                  {r.clearance_type === 'EMERGENCY' &&
                    <span style={{ color:'var(--purple-text)', fontWeight:700 }}>⚡ EMRG</span>}
                </div>
              </div>

              <span style={{ fontSize:12, color:'var(--text-secondary)' }}>
                {fmt(r.proposed_entry_date)}
              </span>

              <ProgressBar
                approved={parseInt(r.approved_count)||0}
                total={parseInt(r.total_mandatory)||5}
                rejected={parseInt(r.rejected_count)||0}
              />

              <StatusPill status={r.status} overdue={over} />
            </Link>
          );
        })}
      </div>

      <div style={{ marginTop:14, fontSize:11, color:'var(--text-subtle)', textAlign:'center' }}>
        DCMS v1.0 · Restricted to Authorised DFA Personnel · All actions are audited and logged
      </div>
    </div>
  );
}
