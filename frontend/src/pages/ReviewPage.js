import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { fetchReview, updateReview } from '../utils/api';
import { fmt, fmtDateTime } from '../utils/helpers';
import { Card, Button, Spinner, Input } from '../components/UI';

export default function ReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [decision, setDecision] = useState(null);
  const [comments, setComments] = useState('');
  const [conditions, setConditions] = useState('');
  const [officer, setOfficer] = useState('');
  const [assessment, setAssessment] = useState({});

  const { data: review, isLoading } = useQuery({
    queryKey: ['review', id],
    queryFn: () => fetchReview(id),
  });

  const mutation = useMutation({
    mutationFn: () => updateReview(id, {
      status: decision,
      comments,
      conditions,
      assessment_data: assessment,
      assigned_to: officer
    }),
    onSuccess: () => {
      toast.success('Review submitted!');
      qc.invalidateQueries(['review', id]);
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner /></div>;
  if (!review) return <div style={{ padding:40, textAlign:'center' }}>Review not found.</div>;

  const r = review.request || {};
  const isDone = review.status !== 'PENDING';

  return (
    <div style={{ padding: '16px 0' }} className="container">
      <div style={{ padding: '0 20px', maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontFamily:'var(--font-serif)', fontSize:24, fontWeight:700, marginBottom:8 }}>
          Agency Review: {review.dept_code}
        </h1>
        <p style={{ color:'var(--text-muted)', fontSize:13, marginBottom:24 }}>
          Please review the following diplomatic clearance application.
        </p>

        <Card style={{ marginBottom:20 }}>
          <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', marginBottom:12 }}>Application Summary</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:16 }}>
            <div><div style={{fontSize:10, color:'var(--text-muted)'}}>Vessel</div><div style={{fontWeight:600}}>{r.vessel_name}</div></div>
            <div><div style={{fontSize:10, color:'var(--text-muted)'}}>Mission</div><div style={{fontWeight:600}}>{r.mission_name}</div></div>
            <div><div style={{fontSize:10, color:'var(--text-muted)'}}>Entry Date</div><div style={{fontWeight:600}}>{fmt(r.proposed_entry_date)}</div></div>
            <div><div style={{fontSize:10, color:'var(--text-muted)'}}>Type</div><div style={{fontWeight:600}}>{r.clearance_type}</div></div>
          </div>
        </Card>

        {isDone ? (
          <Card style={{ textAlign:'center', borderColor:'var(--blue)', background:'var(--blue-dim)' }}>
            <div style={{ fontSize:20, marginBottom:8 }}>✓</div>
            <div style={{ fontWeight:700, color:'var(--text-primary)' }}>Review Completed</div>
            <div style={{ fontSize:13, color:'var(--text-muted)' }}>Status: {review.status}</div>
          </Card>
        ) : (
          <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }}>
            <Card style={{ display:'flex', flexDirection:'column', gap:20 }}>
              <Input label="Your Name / Title *" value={officer} onChange={e => setOfficer(e.target.value)} required />

              <div>
                <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', display:'block', marginBottom:8 }}>Decision *</span>
                <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                  {['APPROVED', 'REJECTED'].map(v => (
                    <Button
                      key={v}
                      type="button"
                      variant={decision === v ? (v === 'APPROVED' ? 'success' : 'danger') : 'secondary'}
                      onClick={() => setDecision(v)}
                      style={{ flex: 1 }}
                    >
                      {v === 'APPROVED' ? '✓ Approve' : '✕ Reject'}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Agency Specific Assessment Modules */}
              <div style={{ padding: '16px', background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize:11, color:'var(--blue-text)', fontWeight:700, textTransform:'uppercase', marginBottom:12 }}>Agency Specific Assessment</div>

                {review.dept_code === 'DOT' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13 }}>
                      <input type="checkbox" checked={!!assessment.route_validated} onChange={e => setAssessment({...assessment, route_validated: e.target.checked})} />
                      Proposed Route Validated (PNG Airspace/Waters)
                    </label>
                    <Input label="Navigation Chart Reference" value={assessment.chart_ref || ''} onChange={e => setAssessment({...assessment, chart_ref: e.target.value})} placeholder="e.g. PNG-104-B" />
                  </div>
                )}

                {review.dept_code === 'RPNGC' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13 }}>
                      <input type="checkbox" checked={!!assessment.firearms_checked} onChange={e => setAssessment({...assessment, firearms_checked: e.target.checked})} />
                      Firearms & Security Personnel Vetted
                    </label>
                    <Input label="Armoury Permit ID" value={assessment.permit_id || ''} onChange={e => setAssessment({...assessment, permit_id: e.target.value})} />
                  </div>
                )}

                {review.dept_code === 'PNGDF' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13 }}>
                      <input type="checkbox" checked={!!assessment.military_coordination} onChange={e => setAssessment({...assessment, military_coordination: e.target.checked})} />
                      Joint Military Coordination Confirmed
                    </label>
                    <Input label="Liaison Officer Code" value={assessment.liaison_code || ''} onChange={e => setAssessment({...assessment, liaison_code: e.target.value})} />
                  </div>
                )}

                {(review.dept_code === 'NICTA' || review.dept_code === 'DICT') && (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13 }}>
                      <input type="checkbox" checked={!!assessment.tech_compliant} onChange={e => setAssessment({...assessment, tech_compliant: e.target.checked})} />
                      Technical Compliance & Frequency Check Complete
                    </label>
                    <Input label="Spectrum Allocation Ref" value={assessment.spectrum_ref || ''} onChange={e => setAssessment({...assessment, spectrum_ref: e.target.value})} />
                  </div>
                )}

                {!['DOT','RPNGC','PNGDF','NICTA','DICT'].includes(review.dept_code) && (
                   <div style={{ fontSize:12, color:'var(--text-muted)' }}>Standard review module active for {review.dept_code}.</div>
                )}
              </div>

              <label style={{ display:'flex', flexDirection:'column', gap:4 }}>
                <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase' }}>Comments</span>
                <textarea
                  value={comments} onChange={e => setComments(e.target.value)}
                  rows={3} style={{ background:'var(--bg-elevated)', border:'1px solid var(--border-light)', borderRadius:'var(--radius-sm)', padding:10, color:'#fff', outline:'none' }}
                />
              </label>

              <Button type="submit" variant="primary" disabled={!decision || !officer || mutation.isPending} style={{ justifyContent:'center' }}>
                {mutation.isPending ? 'Submitting...' : 'Submit Decision'}
              </Button>
            </Card>
          </form>
        )}
      </div>
    </div>
  );
}
