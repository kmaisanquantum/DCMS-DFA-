#!/usr/bin/env python3
"""
DCMS QR Code Verification Tool
Mobile-responsive Flask web app for PNG Customs officers.

Setup:
    pip install flask flask-cors requests pyzbar pillow
    pip install opencv-python numpy  # optional, improves QR detection

Run:
    export DCMS_API_BASE=https://dcms.dfa.gov.pg/api
    python app.py
"""

import os
import json
import base64
from datetime import datetime
from io import BytesIO

import requests as http_requests
from flask import Flask, request, jsonify
from flask_cors import CORS

try:
    from pyzbar.pyzbar import decode as pyzbar_decode
    from PIL import Image
    HAS_PYZBAR = True
except ImportError:
    HAS_PYZBAR = False

try:
    import cv2
    import numpy as np
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False

app = Flask(__name__)
CORS(app)

DCMS_API_BASE = os.environ.get("DCMS_API_BASE", "http://localhost:3001/api")


# ── QR Decoding ───────────────────────────────────────────────

def decode_qr(image_bytes: bytes) -> str | None:
    if HAS_PYZBAR:
        img = Image.open(BytesIO(image_bytes)).convert("RGB")
        results = pyzbar_decode(img)
        if results:
            return results[0].data.decode("utf-8")

    if HAS_CV2:
        arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        detector = cv2.QRCodeDetector()
        data, _, _ = detector.detectAndDecode(img)
        if data:
            return data

    return None


def extract_hash(raw: str) -> str | None:
    raw = raw.strip()
    try:
        payload = json.loads(raw)
        return payload.get("h") or payload.get("hash") or payload.get("digital_hash")
    except (json.JSONDecodeError, TypeError):
        if len(raw) == 128 and all(c in "0123456789abcdef" for c in raw.lower()):
            return raw
    return None


# ── DCMS API Call ─────────────────────────────────────────────

def verify_with_api(digital_hash: str) -> dict:
    try:
        resp = http_requests.get(
            f"{DCMS_API_BASE}/clearances/verify/{digital_hash}",
            timeout=10,
            headers={"User-Agent": "DCMS-Scanner/1.0"},
        )
        if resp.status_code == 200:
            return resp.json()
        elif resp.status_code == 404:
            return {"valid": False, "status": "NOT_FOUND",
                    "error": "Clearance not found. This QR code may be fraudulent."}
        return {"valid": False, "status": "API_ERROR",
                "error": f"Server returned HTTP {resp.status_code}"}
    except http_requests.Timeout:
        return {"valid": False, "status": "TIMEOUT", "error": "Request timed out."}
    except http_requests.ConnectionError:
        return {"valid": False, "status": "OFFLINE",
                "error": "Cannot reach DCMS server. Check network connection."}


# ── Endpoints ─────────────────────────────────────────────────

@app.route("/scan", methods=["POST"])
def scan():
    digital_hash = None

    if "image" in request.files:
        raw_qr = decode_qr(request.files["image"].read())
        if not raw_qr:
            return jsonify({"valid": False, "error": "No QR code detected in image."}), 400
        digital_hash = extract_hash(raw_qr)
    elif request.is_json:
        data = request.get_json(force=True)
        digital_hash = data.get("hash") or extract_hash(data.get("qr_data", ""))

    if not digital_hash:
        return jsonify({"valid": False, "error": "Could not extract clearance hash."}), 400

    result = verify_with_api(digital_hash)
    result["scanned_at"] = datetime.utcnow().isoformat() + "Z"
    return jsonify(result)


@app.route("/health")
def health():
    return jsonify({"status": "ok", "service": "DCMS-Scanner",
                    "api_base": DCMS_API_BASE})


@app.route("/")
@app.route("/scanner")
def scanner_ui():
    return HTML_UI


# ── Mobile Web UI ─────────────────────────────────────────────

HTML_UI = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
  <title>DCMS Scanner · PNG Customs</title>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700&family=IBM+Plex+Mono:wght@400&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    :root{
      --bg:#020617;--surface:#0f172a;--elevated:#1e293b;--border:#1e293b;
      --text:#e2e8f0;--muted:#64748b;--subtle:#334155;
      --green:#4ade80;--yellow:#fbbf24;--red:#f87171;--blue:#60a5fa;
    }
    body{font-family:'IBM Plex Sans',system-ui,sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
    .header{background:var(--surface);border-bottom:1px solid var(--border);padding:14px 20px;display:flex;align-items:center;gap:12px}
    .container{max-width:480px;margin:0 auto;padding:20px 16px}
    .card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:16px}
    .label{font-size:10px;color:var(--muted);letter-spacing:.12em;text-transform:uppercase;font-weight:700;margin-bottom:10px}
    #video-wrap{position:relative;border-radius:10px;overflow:hidden;background:#000;margin-bottom:12px}
    #video{width:100%;max-height:260px;object-fit:cover;display:block}
    #canvas{display:none}
    .frame{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none}
    .frame-box{width:190px;height:190px;border:2px solid rgba(34,197,94,.7);border-radius:8px;position:relative}
    .scan-line{position:absolute;top:0;left:0;right:0;height:2px;background:rgba(34,197,94,.9);animation:scan 2s infinite ease-in-out}
    @keyframes scan{0%{top:0}50%{top:calc(100% - 2px)}100%{top:0}}
    .btn{width:100%;padding:13px;border-radius:10px;border:none;font-size:14px;font-weight:700;cursor:pointer;transition:all .2s;margin-bottom:8px;font-family:inherit}
    .btn-primary{background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;box-shadow:0 4px 20px rgba(14,165,233,.3)}
    .btn-secondary{background:var(--elevated);color:#94a3b8;border:1px solid #334155}
    .btn:disabled{opacity:.4;cursor:not-allowed}
    .divider{display:flex;align-items:center;gap:8px;color:#334155;font-size:11px;margin:12px 0}
    .divider::before,.divider::after{content:'';flex:1;height:1px;background:#1e293b}
    .manual-input{width:100%;background:var(--elevated);border:1px solid #334155;border-radius:8px;padding:11px 14px;color:var(--text);font-size:13px;outline:none;font-family:'IBM Plex Mono',monospace;margin-bottom:8px}
    .manual-input::placeholder{color:#475569}
    .result{border-radius:14px;padding:20px;margin-top:16px;border:2px solid;animation:fadein .3s ease}
    @keyframes fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    .valid-card{border-color:#16a34a;background:rgba(22,163,74,.07)}
    .warn-card{border-color:#d97706;background:rgba(217,119,6,.07)}
    .invalid-card{border-color:#dc2626;background:rgba(220,38,38,.07)}
    .badge{display:inline-flex;align-items:center;gap:6px;padding:6px 16px;border-radius:999px;font-size:13px;font-weight:800;margin-bottom:14px}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
    .info-item .k{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;margin-bottom:2px}
    .info-item .v{font-size:14px;font-weight:700;color:#f1f5f9}
    .full{grid-column:1/-1}
    .loading{text-align:center;padding:32px;color:var(--muted)}
    .spinner{width:36px;height:36px;border:3px solid var(--elevated);border-top-color:#0ea5e9;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 12px}
    @keyframes spin{to{transform:rotate(360deg)}}
    #file-in{display:none}
  </style>
</head>
<body>
<div class="header">
  <span style="font-size:28px">🇵🇬</span>
  <div>
    <div style="font-size:15px;font-weight:800;color:#f8fafc">Clearance Verifier</div>
    <div style="font-size:11px;color:#64748b">DCMS · PNG Customs & DFA</div>
  </div>
</div>

<div class="container">
  <div class="card">
    <div class="label">📷 Camera Scan</div>
    <div id="video-wrap" style="display:none">
      <video id="video" autoplay playsinline></video>
      <canvas id="canvas"></canvas>
      <div class="frame"><div class="frame-box"><div class="scan-line"></div></div></div>
    </div>
    <button class="btn btn-primary" id="startBtn">📸 Activate Camera</button>
    <button class="btn btn-secondary" id="captureBtn" style="display:none">✅ Capture & Scan</button>
    <button class="btn btn-secondary" id="stopBtn" style="display:none">✕ Stop Camera</button>
  </div>

  <div class="card">
    <div class="label">🖼 Upload QR Image</div>
    <button class="btn btn-secondary" onclick="document.getElementById('file-in').click()">📁 Choose / Take Photo</button>
    <input type="file" id="file-in" accept="image/*" capture="environment">
  </div>

  <div class="divider">or enter manually</div>

  <div class="card">
    <div class="label">⌨ Manual Entry</div>
    <input class="manual-input" id="manualInput" type="text" placeholder="Paste SHA-512 hash or scan data…" maxlength="256">
    <button class="btn btn-primary" id="manualBtn">🔍 Verify Clearance</button>
  </div>

  <div id="resultArea"></div>
</div>

<script>
let stream = null;

document.getElementById('startBtn').onclick = async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1280}}});
    document.getElementById('video').srcObject = stream;
    document.getElementById('video-wrap').style.display = 'block';
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('captureBtn').style.display = 'block';
    document.getElementById('stopBtn').style.display = 'block';
  } catch(e) {
    showErr('Camera access denied. Use file upload instead.');
  }
};

document.getElementById('captureBtn').onclick = () => {
  const v = document.getElementById('video');
  const c = document.getElementById('canvas');
  c.width = v.videoWidth; c.height = v.videoHeight;
  c.getContext('2d').drawImage(v,0,0);
  c.toBlob(blob => { stopCam(); submitImage(blob); }, 'image/jpeg', 0.92);
};

document.getElementById('stopBtn').onclick = stopCam;

function stopCam() {
  if (stream) { stream.getTracks().forEach(t=>t.stop()); stream=null; }
  document.getElementById('video-wrap').style.display = 'none';
  document.getElementById('startBtn').style.display = 'block';
  document.getElementById('captureBtn').style.display = 'none';
  document.getElementById('stopBtn').style.display = 'none';
}

document.getElementById('file-in').onchange = function() {
  if (this.files[0]) submitImage(this.files[0]);
};

async function submitImage(blob) {
  showLoading();
  const fd = new FormData();
  fd.append('image', blob, 'scan.jpg');
  try {
    const r = await fetch('/scan', {method:'POST', body:fd});
    showResult(await r.json());
  } catch(e) { showErr('Network error: ' + e.message); }
}

document.getElementById('manualBtn').onclick = async () => {
  const h = document.getElementById('manualInput').value.trim();
  if (!h) { showErr('Please enter a hash or scan data.'); return; }
  showLoading();
  try {
    const r = await fetch('/scan', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({hash:h})});
    showResult(await r.json());
  } catch(e) { showErr('Network error: ' + e.message); }
};

function showLoading() {
  document.getElementById('resultArea').innerHTML = '<div class="loading"><div class="spinner"></div>Verifying with DCMS server…</div>';
}
function showErr(msg) {
  document.getElementById('resultArea').innerHTML = `<div class="result invalid-card"><span class="badge" style="color:#f87171;background:rgba(239,68,68,.15)">✕ Error</span><p style="color:#f87171;font-size:13px">${msg}</p></div>`;
}

function showResult(d) {
  const cfg = {
    VALID:         {cls:'valid-card',  bc:'rgba(34,197,94,.2)',  c:'#4ade80',  lbl:'✓ CLEARANCE VALID'},
    EXPIRED:       {cls:'warn-card',   bc:'rgba(251,191,36,.2)', c:'#fbbf24',  lbl:'⚠ CLEARANCE EXPIRED'},
    REVOKED:       {cls:'invalid-card',bc:'rgba(239,68,68,.2)',  c:'#f87171',  lbl:'✕ CLEARANCE REVOKED'},
    NOT_YET_VALID: {cls:'warn-card',   bc:'rgba(251,191,36,.2)', c:'#fbbf24',  lbl:'⚠ NOT YET VALID'},
    NOT_FOUND:     {cls:'invalid-card',bc:'rgba(239,68,68,.2)',  c:'#f87171',  lbl:'✕ NOT FOUND'},
    API_ERROR:     {cls:'invalid-card',bc:'rgba(239,68,68,.2)',  c:'#f87171',  lbl:'⚠ API ERROR'},
  }[d.status] || {cls:'invalid-card',bc:'rgba(239,68,68,.2)',c:'#f87171',lbl:'⚠ UNKNOWN'};

  const v = d.vessel||{}, rt = d.route||{}, vl = d.validity||{}, p = d.personnel||{};
  const showDetails = d.valid || d.status === 'EXPIRED';

  document.getElementById('resultArea').innerHTML = `
    <div class="result ${cfg.cls}">
      <span class="badge" style="color:${cfg.c};background:${cfg.bc}">${cfg.lbl}</span>
      ${showDetails ? `
        <div class="info-grid">
          <div class="info-item full"><div class="k">Clearance Number</div><div class="v" style="font-family:'IBM Plex Mono';font-size:12px">${d.clearance_number||'—'}</div></div>
          <div class="info-item"><div class="k">Vessel</div><div class="v">${v.name||'—'}</div></div>
          <div class="info-item"><div class="k">Type</div><div class="v">${(v.type||'').replace(/_/g,' ')||'—'}</div></div>
          <div class="info-item"><div class="k">Flag</div><div class="v">${v.flag||'—'}</div></div>
          <div class="info-item"><div class="k">Reg.</div><div class="v">${v.registration||'—'}</div></div>
          <div class="info-item"><div class="k">Port of Entry</div><div class="v">${rt.port_of_entry||'—'}</div></div>
          <div class="info-item"><div class="k">Port of Exit</div><div class="v">${rt.port_of_exit||'—'}</div></div>
          <div class="info-item"><div class="k">Valid From</div><div class="v">${vl.from||'—'}</div></div>
          <div class="info-item" style="${d.status==='EXPIRED'?'color:#f87171'}"><div class="k">Valid Until</div><div class="v" style="${d.status==='EXPIRED'?'color:#f87171':''}">${vl.until||'—'}</div></div>
          <div class="info-item"><div class="k">Crew</div><div class="v">${p.crew??'—'}</div></div>
          <div class="info-item"><div class="k">Passengers</div><div class="v">${p.passengers??'—'}</div></div>
          <div class="info-item full"><div class="k">Issued By</div><div class="v" style="font-size:12px">${vl.issued_by||'—'}</div></div>
        </div>
      ` : `<p style="color:#f87171;font-size:14px;text-align:center;padding:8px 0">${d.error||'Verification failed.'}</p>`}
      <div style="font-size:10px;color:#475569;text-align:right;margin-top:8px">
        Verified ${d.scanned_at ? new Date(d.scanned_at).toLocaleTimeString() : 'now'}
      </div>
    </div>`;
}
</script>
</body>
</html>"""

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    debug = os.environ.get("FLASK_ENV") == "development"
    print(f"DCMS Scanner → http://0.0.0.0:{port}")
    app.run(host="0.0.0.0", port=port, debug=debug)
