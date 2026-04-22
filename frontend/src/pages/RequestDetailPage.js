import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { fetchRequest, issueClearance } from '../utils/api';
import { fmt, fmtDateTime, isOverdue } from '../utils/helpers';
import { StatusPill, ReviewPill, Button, Spinner, Card } from '../components/UI';
import QRModal from '../components/QRModal';

export default function RequestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [qrData, setQrData] = useState(null);
  const [officer, setOfficer] = useState('');

  const { data: request, isLoading } = useQuery({
    queryKey: ['request', id],
    queryFn: () => fetchRequest(id),
    refetchInterval: 15000,
  });

  const issueMutation = useMutation({
    mutationFn: () => issueClearance({
      request_id: id,
      issued_by_officer: officer || 'DFA Officer',
    }),
    onSuccess: (data) => {
      toast.success('Clearance issued successfully!');
      setQrData(data);
      qc.invalidateQueries(['request', id]);
      qc.invalidateQueries(['requests']);
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner size={40} /></div>
  );
  if (!request) return (
    <div style={{ padding:40, color:'var(--red-text)', textAlign:'center' }}>Request not found.</div>
  );

  const over = isOverdue(request);
  const canIssue = request.status === 'ALL_APPROVED';
  const reviews = request.reviews || [];

  return (
    <div style={{ padding:'24px 28px', maxWidth:900 }}>
      {/* Back */}
      <button onClick={() => navigate('/dashboard')} style={{
        background:'none', border:'none', color:'var(--text-muted)',
        fontSize:13, cursor:'pointer', marginBottom:20,
        display:'flex', alignItems:'center', gap:6,
      }}>← Back to Dashboard</button>

      {/* Title row */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-serif)', fontSize:26, color:'var(--text-primary)',
            fontWeight:700, marginBottom:4 }}>{request.vessel_name}</h1>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--blue-text)',
            marginBottom:8 }}>{request.reference_number}</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <StatusPill status={request.status} overdue={over} />
            {request.clearance_type === 'EMERGENCY' && (
              <span style={{ padding:'2px 10px', borderRadius:999, fontSize:11, fontWeight:700,
                color:'var(--purple-text)', background:'var(--purple-dim)' }}>⚡ Emergency 24h</span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:20 }}>
        {/* Left column */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

          {/* Request info */}
          <Card>
            <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700,
              textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:14 }}>
              Request Details
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              {[
                ['Mission',       request.mission_name],
                ['Country',       request.country_name],
                ['Vessel Type',   request.vessel_type?.replace(/_/g,' ')],
                ['Flag',          request.vessel_flag],
                ['Port of Entry', request.port_of_entry],
                ['Port of Exit',  request.port_of_exit || '—'],
                ['Entry Date',    fmt(request.proposed_entry_date)],
                ['Exit Date',     fmt(request.proposed_exit_date)],
                ['Crew',          request.total_crew ?? '—'],
                ['Passengers',    request.total_passengers ?? '—'],
                ['Submitted',     fmtDateTime(request.submitted_at)],
                ['Deadline',      fmtDateTime(request.review_deadline)],
              ].map(([k,v]) => (
                <div key={k}>
                  <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase',
                    letterSpacing:'0.1em', marginBottom:2 }}>{k}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{v}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Agency Reviews */}
          <Card>
            <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700,
              textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:14 }}>
              Agency Reviews
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {reviews.map(rv => (
                <div key={rv.review_id} style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  background:'var(--bg-elevated)', borderRadius:'var(--radius-md)',
                  padding:'10px 14px',
                }}>
                  <div>
                    <div style={{ fontWeight:700, color:'var(--text-primary)', fontSize:13 }}>
                      {rv.dept_code}
                    </div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>{rv.dept_name}</div>
                    {rv.reviewed_at && (
                      <div style={{ fontSize:10, color:'var(--text-subtle)', marginTop:2 }}>
                        {fmtDateTime(rv.reviewed_at)}
                      </div>
                    )}
                  </div>
                  <ReviewPill status={rv.status} />
                </div>
              ))}
              {reviews.length === 0 && (
                <div style={{ color:'var(--text-muted)', fontSize:13, textAlign:'center', padding:16 }}>
                  No reviews yet
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right column — issue clearance */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <Card>
            <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700,
              textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:14 }}>
              Issue Clearance
            </div>

            {/* Progress bar */}
            <div style={{ marginBottom:16 }}>
              {(() => {
                const approved = reviews.filter(r => r.status === 'APPROVED').length;
                const total = reviews.filter(r => r.is_mandatory !== false).length || 5;
                const pct = Math.round((approved / total) * 100);
                const color = approved === total ? '#22c55e' : '#eab308';
                return (
                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                      <span style={{ color:'var(--text-muted)' }}>{approved}/{total} agencies approved</span>
                      <span style={{ color, fontWeight:700 }}>{pct}%</span>
                    </div>
                    <div style={{ height:6, background:'var(--bg-elevated)', borderRadius:99 }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:color,
                        borderRadius:99, transition:'width .5s' }} />
                    </div>
                  </div>
                );
              })()}
            </div>

            {canIssue ? (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <label style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700,
                    textTransform:'uppercase', letterSpacing:'0.1em' }}>Issuing Officer</span>
                  <input
                    value={officer}
                    onChange={e => setOfficer(e.target.value)}
                    placeholder="Enter officer name"
                    style={{
                      background:'var(--bg-elevated)', border:'1px solid var(--border-light)',
                      borderRadius:'var(--radius-sm)', padding:'9px 12px',
                      color:'var(--text-primary)', fontSize:13, outline:'none',
                    }}
                  />
                </label>
                <Button
                  variant="success"
                  onClick={() => issueMutation.mutate()}
                  disabled={issueMutation.isPending || !officer.trim()}
                  style={{ width:'100%', justifyContent:'center' }}
                >
                  {issueMutation.isPending ? '⏳ Generating…' : '⬛ Generate QR Clearance'}
                </Button>
              </div>
            ) : (
              <div style={{ textAlign:'center', padding:'12px 0' }}>
                <div style={{ fontSize:24, marginBottom:8 }}>🔒</div>
                <div style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.5 }}>
                  {request.status === 'CLEARANCE_ISSUED'
                    ? 'Clearance has already been issued.'
                    : 'All 5 mandatory agencies must approve before DFA can issue a clearance.'}
                </div>
              </div>
            )}
          </Card>

          {/* If clearance already issued */}
          {request.status === 'CLEARANCE_ISSUED' && (
            <Card style={{ borderColor:'var(--green)', background:'var(--green-dim)' }}>
              <div style={{ fontSize:11, color:'var(--green-text)', fontWeight:700,
                textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:8 }}>
                ✓ Clearance Issued
              </div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                This request has a valid digital clearance issued by DFA.
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* QR Modal */}
      {qrData && (
        <QRModal
          clearance={qrData}
          request={request}
          onClose={() => setQrData(null)}
        />
      )}
    </div>
  );
}
