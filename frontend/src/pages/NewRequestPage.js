import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { submitRequest, fetchMissions, fetchCategories } from '../utils/api';
import { Button, Input, Select, PageHeader, Card } from '../components/UI';

export default function NewRequestPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    mission_id:'', category_id:'', category_metadata:{},
    port_of_entry:'', port_of_exit:'',
    proposed_entry_date:'', proposed_exit_date:'',
    total_crew:'0', total_passengers:'0', intended_activities:'',
    clearance_type:'STANDARD', emergency_reason:'',
  });

  const { data: missionsData } = useQuery({
    queryKey: ['missions'],
    queryFn: fetchMissions,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const selectedCategory = categoriesData?.categories?.find(c => c.category_id === form.category_id);

  const mutation = useMutation({
    mutationFn: submitRequest,
    onSuccess: (data) => {
      toast.success(`Request ${data.reference_number} submitted!`);
      navigate(`/requests/${data.request_id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setMeta = (k) => (e) => setForm(f => ({
    ...f,
    category_metadata: { ...f.category_metadata, [k]: e.target.value }
  }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.mission_id) { toast.error('Please select a mission'); return; }

    const entryDate = new Date(form.proposed_entry_date);
    const today = new Date();
    const diffDays = Math.ceil((entryDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 10 && form.clearance_type !== 'EMERGENCY') {
      const confirmEmergency = window.confirm(
        'The 10-Day Rule: This request is scheduled for less than 10 working days from today. ' +
        'SOP requires this to be submitted as an "Emergency" (24-hour expedited process). ' +
        'Would you like to flag this as an Emergency?'
      );
      if (confirmEmergency) {
        setForm(f => ({ ...f, clearance_type: 'EMERGENCY' }));
        return;
      } else {
        return;
      }
    }

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

          {/* Category & Dynamic Metadata */}
          <Card style={{ marginBottom:20 }}>
            <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700,
              textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:14 }}>
              Clearance Category & Details
            </div>
            <div style={{ marginBottom: 14 }}>
              <Select label="Clearance Category *" value={form.category_id} onChange={set('category_id')} required>
                <option value="">— Select Category —</option>
                {categoriesData?.categories?.map(c => (
                  <option key={c.category_id} value={c.category_id}>{c.display_name}</option>
                ))}
              </Select>
            </div>

            {selectedCategory?.metadata_schema?.fields?.length > 0 && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:14, padding: '14px', background: 'var(--bg-base)', borderRadius: 'var(--radius-md)' }}>
                {selectedCategory.metadata_schema.fields.map(field => (
                  <Input
                    key={field.name}
                    label={field.label + (field.required ? ' *' : '')}
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={form.category_metadata[field.name] || ''}
                    onChange={setMeta(field.name)}
                    required={field.required}
                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                  />
                ))}
              </div>
            )}
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
