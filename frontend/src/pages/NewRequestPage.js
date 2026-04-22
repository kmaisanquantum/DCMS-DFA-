import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { submitRequest, fetchMissions } from '../utils/api';
import { Button, Input, Select, PageHeader, Card } from '../components/UI';

const VESSEL_TYPES = [
  'NAVAL_VESSEL','COAST_GUARD','RESEARCH_VESSEL',
  'DIPLOMATIC_AIRCRAFT','MILITARY_AIRCRAFT','COMMERCIAL_CHARTER',
];

export default function NewRequestPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    mission_id:'', vessel_type:'NAVAL_VESSEL', vessel_name:'', vessel_flag:'',
    vessel_registration:'', port_of_entry:'', port_of_exit:'',
    proposed_entry_date:'', proposed_exit_date:'',
    total_crew:'0', total_passengers:'0', intended_activities:'',
    clearance_type:'STANDARD', emergency_reason:'',
  });

  const { data: missionsData } = useQuery({
    queryKey: ['missions'],
    queryFn: fetchMissions,
  });

  const mutation = useMutation({
    mutationFn: submitRequest,
    onSuccess: (data) => {
      toast.success(`Request ${data.reference_number} submitted!`);
      navigate(`/requests/${data.request_id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.mission_id) { toast.error('Please select a mission'); return; }
    mutation.mutate({
      ...form,
      total_crew: parseInt(form.total_crew) || 0,
      total_passengers: parseInt(form.total_passengers) || 0,
    });
  };

  return (
    <div style={{ padding: '16px 0' }} className="container">
      <div style={{ padding: '0 20px' }}>
        <button onClick={() => navigate('/dashboard')} style={{
          background:'none', border:'none', color:'var(--text-muted)',
          fontSize:13, cursor:'pointer', marginBottom:20,
          display:'flex', alignItems:'center', gap:6,
        }}>← Back to Dashboard</button>

        <PageHeader
          title="New Clearance Request"
          subtitle="Submit a diplomatic application"
        />

        <form onSubmit={handleSubmit}>
          {/* Mission */}
          <Card style={{ marginBottom:20 }}>
            <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700,
              textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:14 }}>
              Foreign Mission
            </div>
            <Select label="Mission *" value={form.mission_id} onChange={set('mission_id')} required>
              <option value="">— Select Mission —</option>
              {missionsData?.missions?.map(m => (
                <option key={m.mission_id} value={m.mission_id}>
                  {m.mission_name} ({m.country_name})
                </option>
              ))}
            </Select>
          </Card>

          {/* Vessel info */}
          <Card style={{ marginBottom:20 }}>
            <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700,
              textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:14 }}>
              Vessel / Craft Information
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:14 }}>
              <Select label="Vessel Type *" value={form.vessel_type} onChange={set('vessel_type')} required>
                {VESSEL_TYPES.map(t => (
                  <option key={t} value={t}>{t.replace(/_/g,' ')}</option>
                ))}
              </Select>
              <Input label="Vessel Name *" value={form.vessel_name} onChange={set('vessel_name')} required placeholder="e.g. HMAS Brisbane" />
              <Input label="Flag (ISO 3-letter) *" value={form.vessel_flag} onChange={set('vessel_flag')} required placeholder="e.g. AUS" maxLength={3} />
              <Input label="Registration Number" value={form.vessel_registration} onChange={set('vessel_registration')} placeholder="Optional" />
            </div>
          </Card>

          {/* Route */}
          <Card style={{ marginBottom:20 }}>
            <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700,
              textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:14 }}>
              Route & Schedule
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:14 }}>
              <Input label="Port of Entry *" value={form.port_of_entry} onChange={set('port_of_entry')} required placeholder="e.g. Port Moresby" />
              <Input label="Port of Exit" value={form.port_of_exit} onChange={set('port_of_exit')} placeholder="e.g. Rabaul" />
              <Input label="Proposed Entry Date *" type="date" value={form.proposed_entry_date} onChange={set('proposed_entry_date')} required />
              <Input label="Proposed Exit Date *" type="date" value={form.proposed_exit_date} onChange={set('proposed_exit_date')} required />
              <Input label="Total Crew" type="number" min="0" value={form.total_crew} onChange={set('total_crew')} />
              <Input label="Total Passengers" type="number" min="0" value={form.total_passengers} onChange={set('total_passengers')} />
            </div>
            <div style={{ marginTop:14 }}>
              <label style={{ display:'flex', flexDirection:'column', gap:4 }}>
                <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700,
                  textTransform:'uppercase', letterSpacing:'0.1em' }}>Intended Activities</span>
                <textarea
                  value={form.intended_activities}
                  onChange={set('intended_activities')}
                  placeholder="Describe the purpose of the visit..."
                  rows={3}
                  style={{
                    background:'var(--bg-elevated)', border:'1px solid var(--border-light)',
                    borderRadius:'var(--radius-sm)', padding:'9px 12px',
                    color:'var(--text-primary)', fontSize:13, outline:'none',
                    resize:'vertical', width:'100%',
                  }}
                />
              </label>
            </div>
          </Card>

          {/* Clearance type */}
          <Card style={{ marginBottom:28 }}>
            <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700,
              textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:14 }}>
              Clearance Type
            </div>
            <div style={{ display:'flex', gap:12, marginBottom: form.clearance_type === 'EMERGENCY' ? 14 : 0, flexWrap: 'wrap' }}>
              {[['STANDARD','Standard (10 days)'],['EMERGENCY','⚡ Emergency (24h)']].map(([v,l]) => (
                <label key={v} style={{
                  flex:'1 1 200px', padding:'12px 16px', borderRadius:'var(--radius-md)', cursor:'pointer',
                  border:`2px solid ${form.clearance_type === v
                    ? (v === 'EMERGENCY' ? 'var(--purple)' : 'var(--blue)')
                    : 'var(--border)'}`,
                  background: form.clearance_type === v
                    ? (v === 'EMERGENCY' ? 'var(--purple-dim)' : 'var(--blue-dim)')
                    : 'transparent',
                  display:'flex', alignItems:'center', gap:8,
                }}>
                  <input type="radio" name="clearance_type" value={v}
                    checked={form.clearance_type === v} onChange={set('clearance_type')}
                    style={{ accentColor: v === 'EMERGENCY' ? 'var(--purple)' : 'var(--blue)' }} />
                  <span style={{ fontSize:13, fontWeight:600,
                    color: form.clearance_type === v ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {l}
                  </span>
                </label>
              ))}
            </div>
            {form.clearance_type === 'EMERGENCY' && (
              <label style={{ display:'flex', flexDirection:'column', gap:4 }}>
                <span style={{ fontSize:11, color:'var(--purple-text)', fontWeight:700,
                  textTransform:'uppercase', letterSpacing:'0.1em' }}>Emergency Reason *</span>
                <textarea
                  value={form.emergency_reason}
                  onChange={set('emergency_reason')}
                  required
                  placeholder="Provide justification..."
                  rows={2}
                  style={{
                    background:'var(--bg-elevated)', border:'1px solid rgba(139,92,246,.4)',
                    borderRadius:'var(--radius-sm)', padding:'9px 12px',
                    color:'var(--text-primary)', fontSize:13, outline:'none',
                    resize:'vertical', width:'100%',
                  }}
                />
              </label>
            )}
          </Card>

          <div style={{ display:'flex', gap:12, flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={() => navigate('/dashboard')} type="button" style={{ flex: '1 1 120px' }}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={mutation.isPending}
              style={{ flex:'2 1 240px', justifyContent:'center' }}>
              {mutation.isPending ? '⏳ Submitting…' : '→ Submit Request'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
