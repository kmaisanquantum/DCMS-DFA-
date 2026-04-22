import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { fetchReview, updateReview } from '../utils/api';
import { fmt } from '../utils/helpers';
import { Button, Card, ReviewPill, Spinner } from '../components/UI';

const DECISIONS = [
  { value:'APPROVED',             label:'✓ Approve',          variant:'success' },
  { value:'REJECTED',             label:'✕ Reject',           variant:'danger' },
  { value:'INFORMATION_REQUESTED',label:'? Request Info',     variant:'secondary' },
];

export default function ReviewPage() {
  const { reviewId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [decision, setDecision] = useState('');
  const [comments, setComments] = useState('');
  const [conditions, setConditions] = useState('');
  const [officerName, setOfficerName] = useState('');

  const { data: review, isLoading } = useQuery({
    queryKey: ['review', reviewId],
    queryFn: () => fetchReview(reviewId),
  });

  const mutation = useMutation({
    mutationFn: () => updateReview(reviewId, {
      status: decision,
      comments,
      conditions,
      assigned_to: officerName,
    }),
    onSuccess: () => {
      toast.success('Review submitted successfully');
      qc.invalidateQueries(['review', reviewId]);
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:80 }}><Spinner size={40} /></div>
  );
  if (!review) return (
    <div style={{ padding:40, color:'var(--red-text)', textAlign:'center' }}>Review not found.</div>
  );

  const isComplete = ['APPROVED','REJECTED'].includes(review.status);

  return (
    <div style={{ maxWidth:640, margin:'0 auto', padding:'40px 24px' }}>
      {/* Header */}
      <div style={{ textAlign:'center', marginBottom:32 }}>
        <div style={{ fontSize:10, color:'var(--text-muted)', letterSpacing:'0.2em',
          fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>
          DCMS · Papua New Guinea
        </div>
        <h1 style={{ fontFamily:'var(--font-serif)', fontSize:26, color:'var(--text-primary)',
          fontWeight:700, marginBottom:4 }}>Departmental Review</h1>
        <div style={{ display:'flex', justifyContent:'center' }}>
          <ReviewPill status={review.status} />
        </div>
      </div>

      {/* Request summary */}
      <Card style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700,
          textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:14 }}>
          Application Summary
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {[
            ['Reference', review.reference_number],
            ['Department', review.dept_name],
            ['Vessel', review.vessel_name],
            ['Notified', review.notified_at ? fmt(review.notified_at) : '—'],
          ].map(([k,v]) => (
            <div key={k}>
              <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase',
                letterSpacing:'0.1em', marginBottom:2 }}>{k}</div>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>{v}</div>
            </div>
          ))}
        </div>
      </Card>

      {isComplete ? (
        <Card style={{ textAlign:'center', borderColor:'var(--green)', background:'var(--green-dim)' }}>
          <div style={{ fontSize:32, marginBottom:8 }}>✅</div>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', marginBottom:6 }}>
            Review Submitted
          </div>
          <ReviewPill status={review.status} />
          {review.comments && (
            <div style={{ marginTop:12, fontSize:13, color:'var(--text-muted)' }}>
              {review.comments}
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700,
            textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:14 }}>
            Submit Decision
          </div>

          {/* Officer name */}
          <label style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:14 }}>
            <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700,
              textTransform:'uppercase', letterSpacing:'0.1em' }}>Officer Name</span>
            <input value={officerName} onChange={e => setOfficerName(e.target.value)}
              placeholder="Your name and title"
              style={{ background:'var(--bg-elevated)', border:'1px solid var(--border-light)',
                borderRadius:'var(--radius-sm)', padding:'9px 12px',
                color:'var(--text-primary)', fontSize:13, outline:'none' }} />
          </label>

          {/* Decision buttons */}
          <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700,
            textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>
            Decision
          </div>
          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            {DECISIONS.map(d => (
              <button key={d.value} onClick={() => setDecision(d.value)} style={{
                flex:1, padding:'10px 8px', borderRadius:'var(--radius-md)',
                border:`2px solid ${decision === d.value
                  ? (d.value === 'APPROVED' ? 'var(--green)' : d.value === 'REJECTED' ? 'var(--red)' : 'var(--blue)')
                  : 'var(--border)'}`,
                background: decision === d.value
                  ? (d.value === 'APPROVED' ? 'var(--green-dim)' : d.value === 'REJECTED' ? 'var(--red-dim)' : 'var(--blue-dim)')
                  : 'transparent',
                color: decision === d.value
                  ? (d.value === 'APPROVED' ? 'var(--green-text)' : d.value === 'REJECTED' ? 'var(--red-text)' : 'var(--blue-text)')
                  : 'var(--text-muted)',
                fontSize:12, fontWeight:700, cursor:'pointer', transition:'all .15s',
              }}>{d.label}</button>
            ))}
          </div>

          {/* Comments */}
          <label style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:14 }}>
            <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700,
              textTransform:'uppercase', letterSpacing:'0.1em' }}>Comments</span>
            <textarea value={comments} onChange={e => setComments(e.target.value)}
              placeholder="Add review notes or justification..."
              rows={3} style={{ background:'var(--bg-elevated)', border:'1px solid var(--border-light)',
                borderRadius:'var(--radius-sm)', padding:'9px 12px',
                color:'var(--text-primary)', fontSize:13, outline:'none',
                resize:'vertical', width:'100%' }} />
          </label>

          {/* Conditions (approval only) */}
          {decision === 'APPROVED' && (
            <label style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:20 }}>
              <span style={{ fontSize:11, color:'var(--green-text)', fontWeight:700,
                textTransform:'uppercase', letterSpacing:'0.1em' }}>Conditions (optional)</span>
              <textarea value={conditions} onChange={e => setConditions(e.target.value)}
                placeholder="Any conditions attached to this approval..."
                rows={2} style={{ background:'var(--bg-elevated)', border:'1px solid rgba(34,197,94,.3)',
                  borderRadius:'var(--radius-sm)', padding:'9px 12px',
                  color:'var(--text-primary)', fontSize:13, outline:'none',
                  resize:'vertical', width:'100%' }} />
            </label>
          )}

          <Button
            variant={decision === 'APPROVED' ? 'success' : decision === 'REJECTED' ? 'danger' : 'primary'}
            onClick={() => mutation.mutate()}
            disabled={!decision || mutation.isPending}
            style={{ width:'100%', justifyContent:'center' }}
          >
            {mutation.isPending ? '⏳ Submitting…' : 'Submit Review Decision'}
          </Button>
        </Card>
      )}
    </div>
  );
}
