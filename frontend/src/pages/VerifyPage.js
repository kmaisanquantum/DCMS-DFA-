import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { verifyClearance } from '../utils/api';
import { fmt, fmtDateTime } from '../utils/helpers';

export default function VerifyPage() {
  const { hash } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verifyClearance(hash)
      .then(setResult)
      .catch(err => setResult({ valid: false, status: 'ERROR', error: err.message }))
      .finally(() => setLoading(false));
  }, [hash]);

  const statusCfg = {
    VALID:          { color:'#4ade80', bg:'rgba(34,197,94,.1)',  border:'#16a34a', icon:'✓', label:'CLEARANCE VALID' },
    EXPIRED:        { color:'#fbbf24', bg:'rgba(234,179,8,.1)',  border:'#d97706', icon:'⚠', label:'CLEARANCE EXPIRED' },
    REVOKED:        { color:'#f87171', bg:'rgba(239,68,68,.1)',  border:'#dc2626', icon:'✕', label:'CLEARANCE REVOKED' },
    NOT_YET_VALID:  { color:'#fbbf24', bg:'rgba(234,179,8,.1)',  border:'#d97706', icon:'⚠', label:'NOT YET VALID' },
    NOT_FOUND:      { color:'#f87171', bg:'rgba(239,68,68,.1)',  border:'#dc2626', icon:'✕', label:'NOT FOUND' },
    ERROR:          { color:'#f87171', bg:'rgba(239,68,68,.1)',  border:'#dc2626', icon:'✕', label:'VERIFICATION ERROR' },
  };
  const cfg = statusCfg[result?.status] || statusCfg.ERROR;

  return (
    <div style={{ minHeight:'100vh', background:'#020617', color:'#e2e8f0',
      fontFamily:"'IBM Plex Sans', system-ui, sans-serif", padding:16 }}>
      <div style={{ maxWidth:480, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ textAlign:'center', padding:'24px 0 20px' }}>
          <div style={{ fontSize:32, marginBottom:6 }}>🇵🇬</div>
          <div style={{ fontFamily:"'EB Garamond', serif", fontSize:18, color:'#f8fafc',
            fontWeight:700 }}>Department of Foreign Affairs</div>
          <div style={{ fontSize:11, color:'#64748b', letterSpacing:'0.1em',
            textTransform:'uppercase' }}>Papua New Guinea · Clearance Verification</div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign:'center', padding:60 }}>
            <div style={{ width:40, height:40, border:'3px solid #1e293b',
              borderTopColor:'#0ea5e9', borderRadius:'50%',
              animation:'spin .8s linear infinite', margin:'0 auto 16px' }} />
            <div style={{ color:'#64748b' }}>Verifying with DCMS server…</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Result */}
        {!loading && result && (
          <div style={{ border:`2px solid ${cfg.border}`, borderRadius:16,
            background: cfg.bg, padding:24, marginBottom:20 }}>

            {/* Status banner */}
            <div style={{ textAlign:'center', marginBottom:20 }}>
              <div style={{ fontSize:48, lineHeight:1, marginBottom:8 }}>{cfg.icon}</div>
              <div style={{ fontSize:20, fontWeight:900, color:cfg.color,
                letterSpacing:'0.05em' }}>{cfg.label}</div>
            </div>

            {(result.valid || result.status === 'EXPIRED') && (
              <>
                {/* Clearance number */}
                <div style={{ background:'rgba(0,0,0,.3)', borderRadius:10, padding:'12px 16px',
                  marginBottom:16, textAlign:'center' }}>
                  <div style={{ fontSize:10, color:'#64748b', textTransform:'uppercase',
                    letterSpacing:'0.1em', marginBottom:4 }}>Clearance Number</div>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:16,
                    color:'#f8fafc', fontWeight:700 }}>{result.clearance_number}</div>
                </div>

                {/* Vessel */}
                <Section title="Vessel">
                  <Row k="Name"         v={result.vessel?.name} />
                  <Row k="Type"         v={result.vessel?.type?.replace(/_/g,' ')} />
                  <Row k="Flag"         v={result.vessel?.flag} />
                  <Row k="Registration" v={result.vessel?.registration} />
                </Section>

                {/* Route */}
                <Section title="Approved Route">
                  <Row k="Port of Entry" v={result.route?.port_of_entry} />
                  <Row k="Port of Exit"  v={result.route?.port_of_exit} />
                </Section>

                {/* Mission */}
                <Section title="Foreign Mission">
                  <Row k="Mission" v={result.mission?.name} />
                  <Row k="Country" v={result.mission?.country} />
                </Section>

                {/* Validity */}
                <Section title="Validity">
                  <Row k="Valid From"  v={fmt(result.validity?.from)} />
                  <Row k="Valid Until" v={fmt(result.validity?.until)}
                    highlight={result.status === 'EXPIRED'} />
                  <Row k="Issued At"   v={fmtDateTime(result.validity?.issued_at)} />
                  <Row k="Issued By"   v={result.validity?.issued_by} />
                </Section>

                {/* Personnel */}
                <Section title="Personnel">
                  <Row k="Crew"       v={result.personnel?.crew ?? '—'} />
                  <Row k="Passengers" v={result.personnel?.passengers ?? '—'} />
                </Section>

                {result.conditions && (
                  <Section title="Conditions">
                    <div style={{ fontSize:13, color:'#94a3b8', lineHeight:1.5 }}>
                      {result.conditions}
                    </div>
                  </Section>
                )}
              </>
            )}

            {!result.valid && result.status !== 'EXPIRED' && (
              <div style={{ textAlign:'center', fontSize:14, color:'#f87171',
                padding:'12px 0' }}>
                {result.error || 'This clearance could not be verified.'}
              </div>
            )}
          </div>
        )}

        {/* Hash */}
        {!loading && (
          <div style={{ background:'#0f172a', border:'1px solid #1e293b', borderRadius:10,
            padding:'12px 16px', marginBottom:20 }}>
            <div style={{ fontSize:10, color:'#475569', textTransform:'uppercase',
              letterSpacing:'0.1em', marginBottom:4 }}>Verification Hash</div>
            <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9,
              color:'#64748b', wordBreak:'break-all' }}>{hash}</div>
          </div>
        )}

        <div style={{ textAlign:'center', fontSize:11, color:'#334155', paddingBottom:24 }}>
          DCMS · Papua New Guinea Department of Foreign Affairs<br />
          Verified {new Date().toLocaleString()}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:10, color:'#64748b', textTransform:'uppercase',
        letterSpacing:'0.12em', fontWeight:700, marginBottom:6 }}>{title}</div>
      <div style={{ background:'rgba(0,0,0,.25)', borderRadius:8, padding:'8px 12px',
        display:'flex', flexDirection:'column', gap:4 }}>
        {children}
      </div>
    </div>
  );
}

function Row({ k, v, highlight }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
      <span style={{ color:'#64748b' }}>{k}</span>
      <span style={{ fontWeight:600, color: highlight ? '#f87171' : '#f1f5f9' }}>{v || '—'}</span>
    </div>
  );
}
