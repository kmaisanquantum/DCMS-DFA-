import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { fmt } from '../utils/helpers';
import { Button } from './UI';

export default function QRModal({ clearance, request, onClose }) {
  const verifyUrl = `${window.location.origin}/verify/${clearance.digital_hash}`;

  return (
    <div
      onClick={onClose}
      style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,.8)', zIndex:200,
        display:'flex', alignItems:'center', justifyContent:'center', padding:16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:'var(--bg-surface)', border:'1px solid var(--border)',
          borderRadius:20, padding:32, maxWidth:440, width:'100%',
          position:'relative', boxShadow:'0 20px 60px rgba(0,0,0,.7)',
        }}
      >
        <button onClick={onClose} style={{
          position:'absolute', top:16, right:16, background:'none',
          border:'none', color:'var(--text-muted)', fontSize:20, cursor:'pointer', lineHeight:1,
        }}>✕</button>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:20 }}>
          <div style={{ fontSize:10, color:'var(--text-muted)', letterSpacing:'0.2em',
            fontWeight:700, textTransform:'uppercase', marginBottom:2 }}>
            Independent State of Papua New Guinea
          </div>
          <div style={{ fontFamily:'var(--font-serif)', fontSize:20, color:'var(--text-primary)',
            fontWeight:700 }}>Department of Foreign Affairs</div>
          <div style={{ fontSize:12, color:'var(--green-text)', marginTop:2, fontWeight:600 }}>
            Digital Diplomatic Clearance Certificate
          </div>
        </div>

        {/* QR Code */}
        <div style={{ display:'flex', justifyContent:'center', marginBottom:20 }}>
          <div style={{ background:'#fff', padding:12, borderRadius:12 }}>
            <QRCodeSVG
              value={verifyUrl}
              size={200}
              level="H"
              includeMargin={false}
            />
          </div>
        </div>

        {/* Details table */}
        <div style={{ background:'var(--bg-elevated)', borderRadius:10, padding:16,
          fontSize:12, color:'var(--text-secondary)', marginBottom:16 }}>
          {[
            ['Clearance No.',  clearance.clearance_number],
            ['Reference',      request?.reference_number],
            ['Vessel',         request?.vessel_name],
            ['Mission',        request?.mission_name],
            ['Port of Entry',  request?.port_of_entry],
            ['Valid From',     fmt(clearance.valid_from)],
            ['Valid Until',    fmt(clearance.valid_until)],
            ['Issued By',      clearance.issued_by_officer],
          ].map(([k, v]) => (
            <div key={k} style={{ display:'flex', justifyContent:'space-between',
              padding:'5px 0', borderBottom:'1px solid var(--border)' }}>
              <span style={{ color:'var(--text-muted)' }}>{k}</span>
              <span style={{ fontWeight:600, color:'var(--text-primary)', textAlign:'right',
                maxWidth:220 }}>{v || '—'}</span>
            </div>
          ))}
        </div>

        {/* Hash strip */}
        <div style={{ padding:10, background:'rgba(34,197,94,.08)',
          border:'1px solid rgba(34,197,94,.25)', borderRadius:8, marginBottom:20 }}>
          <div style={{ fontSize:10, color:'var(--green-text)', fontWeight:700,
            letterSpacing:'0.1em', textAlign:'center', marginBottom:4 }}>
            DIGITALLY AUTHENTICATED — DFA ISSUED
          </div>
          <div style={{ fontSize:9, color:'var(--text-muted)', fontFamily:'var(--font-mono)',
            wordBreak:'break-all', textAlign:'center' }}>
            {clearance.digital_hash?.slice(0, 64)}…
          </div>
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <Button variant="secondary" onClick={onClose} style={{ flex:1 }}>Close</Button>
          <Button variant="success" onClick={() => window.print()} style={{ flex:1 }}>
            🖨 Print Clearance
          </Button>
        </div>
      </div>
    </div>
  );
}
