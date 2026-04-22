# 🇵🇬 Diplomatic Clearance Management System (DCMS)
### Papua New Guinea — Department of Foreign Affairs

A full-stack government web application for managing diplomatic clearances for foreign naval vessels, military aircraft, and diplomatic missions entering PNG territory.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   DCMS Full Stack                        │
├──────────────┬──────────────┬──────────────┬────────────┤
│  PostgreSQL  │  Node/Express│  React SPA   │   Python   │
│  Database    │  REST API    │  Dashboard   │  QR Scanner│
│  :5432       │  :3001       │  :3000       │  :5001     │
└──────────────┴──────────────┴──────────────┴────────────┘
```

## Project Structure

```
dcms/
├── database/
│   ├── migrations/
│   │   └── 001_initial_schema.sql   # Full PostgreSQL schema
│   └── seeds/
│       └── 001_demo_data.sql        # Sample missions & data
│
├── backend/                          # Node.js / Express API
│   ├── src/
│   │   ├── index.js                 # App entry point
│   │   ├── db/
│   │   │   ├── pool.js              # PG connection pool
│   │   │   └── migrate.js           # Migration runner
│   │   ├── routes/
│   │   │   ├── requests.js          # Clearance requests CRUD
│   │   │   ├── reviews.js           # Department reviews
│   │   │   ├── clearances.js        # Final clearance + QR
│   │   │   └── missions.js          # Foreign missions
│   │   ├── middleware/
│   │   │   └── errorHandler.js
│   │   └── utils/
│   │       ├── crypto.js            # SHA-512 QR hash generation
│   │       ├── mailer.js            # Email notifications
│   │       └── logger.js            # Winston logger
│   └── package.json
│
├── frontend/                         # React 18 SPA
│   ├── src/
│   │   ├── App.js                   # Router
│   │   ├── components/
│   │   │   ├── Layout.js            # Sidebar shell
│   │   │   ├── UI.js                # Shared components
│   │   │   └── QRModal.js           # QR certificate modal
│   │   ├── pages/
│   │   │   ├── DashboardPage.js     # Main overview
│   │   │   ├── RequestDetailPage.js # Detail + issue clearance
│   │   │   ├── NewRequestPage.js    # Submission form
│   │   │   ├── ReviewPage.js        # Dept review interface
│   │   │   └── VerifyPage.js        # Public QR verify
│   │   └── utils/
│   │       ├── api.js               # Axios client
│   │       └── helpers.js           # Formatters, classifiers
│   └── package.json
│
├── scanner/                          # Python / Flask QR tool
│   ├── app.py                       # Flask app + mobile UI
│   └── requirements.txt
│
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   ├── Dockerfile.scanner
│   └── nginx.conf
│
├── .github/
│   └── workflows/
│       └── ci.yml                   # GitHub Actions CI/CD
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Quick Start

### Option A — Docker Compose (Recommended)

```bash
# 1. Clone and configure
git clone https://github.com/your-org/dcms.git
cd dcms
cp .env.example .env
# Edit .env with your SMTP and secret values

# 2. Start all services
docker-compose up --build

# Services:
#   Frontend  →  http://localhost:3000
#   API       →  http://localhost:3001
#   Scanner   →  http://localhost:5001
#   Database  →  localhost:5432
```

### Option B — Local Development

#### 1. Database
```bash
psql -U postgres -c "CREATE USER dcms_user WITH PASSWORD 'password';"
psql -U postgres -c "CREATE DATABASE dcms_db OWNER dcms_user;"
psql -U dcms_user -d dcms_db -f database/migrations/001_initial_schema.sql
psql -U dcms_user -d dcms_db -f database/seeds/001_demo_data.sql
```

#### 2. Backend API
```bash
cd backend
cp .env.example .env        # Edit DATABASE_URL etc.
npm install
npm run dev                 # Starts on :3001 with nodemon
```

#### 3. React Frontend
```bash
cd frontend
cp .env.example .env        # REACT_APP_API_URL=http://localhost:3001
npm install
npm start                   # Starts on :3000
```

#### 4. Python QR Scanner
```bash
cd scanner
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python app.py               # Starts on :5001
```

---

## API Reference

| Method | Endpoint                          | Description                              |
|--------|-----------------------------------|------------------------------------------|
| POST   | `/api/requests`                   | Submit new clearance request             |
| GET    | `/api/requests`                   | List requests (with filters)             |
| GET    | `/api/requests/:id`               | Get request + all agency reviews         |
| GET    | `/api/requests/:id/audit`         | Full audit trail                         |
| PUT    | `/api/reviews/:id`                | Department submits approval/rejection    |
| GET    | `/api/reviews/:id`                | Get single review                        |
| POST   | `/api/clearances`                 | DFA issues final clearance (gated)       |
| GET    | `/api/clearances/verify/:hash`    | QR code verification (public)            |
| POST   | `/api/clearances/:id/revoke`      | Revoke a clearance                       |
| GET    | `/api/missions`                   | List active foreign missions             |
| POST   | `/api/missions`                   | Register new mission                     |
| GET    | `/api/departments`                | List reviewing departments               |
| GET    | `/health`                         | Health check                             |

---

## Business Rules

### Submission Deadlines
| Type     | Deadline        | Trigger                        |
|----------|-----------------|--------------------------------|
| Standard | 10 working days | Auto-calculated on submission  |
| Emergency| 24 hours        | Requires `emergency_reason`    |

### Approval Flow
```
Mission submits request
    ↓
System auto-notifies 5 mandatory agencies (DOT, RPNGC, PNGDF, NICTA, DICT)
    ↓
Each agency independently reviews and submits APPROVED / REJECTED
    ↓
DB trigger auto-advances status → ALL_APPROVED when all 5 approve
    ↓ (any rejection → status = REJECTED, blocks clearance)
DFA officer sees "Generate QR Clearance" button (only active when ALL_APPROVED)
    ↓
DFA issues clearance → SHA-512 digital hash → QR code generated
    ↓
Customs officer scans QR at port → /api/clearances/verify/:hash
    ↓
Scanner shows: VALID / EXPIRED / REVOKED + vessel, route, validity details
```

### Database Safeguards (enforced by triggers)
- DFA **cannot** insert into `final_clearances` unless `request.status = ALL_APPROVED`
- Any rejection among mandatory agencies sets `request.status = REJECTED`
- All status transitions are appended to `audit_log` (immutable)
- Emergency requests require a non-null `emergency_reason` (CHECK constraint)

---

## Dashboard Color Legend

| Color  | Meaning                                    |
|--------|--------------------------------------------|
| 🟡 Yellow border | Pending — waiting for agency reviews |
| 🟢 Green border  | Approved / Clearance issued           |
| 🔴 Red border    | Overdue — past review deadline        |
| ⚡ Purple badge  | Emergency 24-hour clearance           |

---

## QR Security

Each clearance QR encodes a compact JSON payload:
```json
{
  "sys": "DCMS-PNG",
  "cn":  "CLR-PNG-2025-000042",
  "h":   "<sha512-hash>",
  "vf":  "2025-07-15",
  "vu":  "2025-07-22",
  "url": "https://dcms.dfa.gov.pg/verify/<sha512-hash>"
}
```

The hash is **SHA-512** keyed with a server-side secret:
```
hash = SHA512( clearanceNumber | requestId | issuedAt | QR_HASH_SECRET )
```

This means QR codes **cannot be forged** without the secret. The `/verify/:hash` endpoint is public so Customs can verify even offline-first by scanning the URL.

---

## Environment Variables

### Backend (`backend/.env`)
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `QR_HASH_SECRET` | Secret key for SHA-512 QR hashes |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Email delivery |
| `PUBLIC_BASE_URL` | Base URL for verify links in QR codes |
| `FRONTEND_URL` | Allowed CORS origin |

### Frontend (`frontend/.env`)
| Variable | Description |
|---|---|
| `REACT_APP_API_URL` | Backend API base URL |

### Scanner (`scanner/.env`)
| Variable | Description |
|---|---|
| `DCMS_API_BASE` | Backend API base URL |
| `PORT` | Scanner web port (default 5001) |

---

## GitHub Actions

The included workflow (`.github/workflows/ci.yml`) runs on every push:

1. **Backend tests** — spins up Postgres, runs migrations, executes Jest tests
2. **Frontend build** — `npm run build` with production env
3. **Scanner tests** — pytest (if tests exist)
4. **Docker build & push** — on `main` branch, pushes images to GitHub Container Registry (`ghcr.io`)

---

## Security Notes

- All requests are rate-limited (100 req / 15 min per IP)
- Helmet.js sets security headers on all API responses
- QR hashes are SHA-512 keyed — cannot be forged externally
- Clearance issuance is double-gated: application check + DB trigger
- Audit log is append-only (no triggers allow UPDATE/DELETE on `audit_log`)
- Revocation is immediate — revoked clearances show `REVOKED` on next scan
- Docker containers run as non-root users

---

## License

Government of Papua New Guinea — Department of Foreign Affairs  
Internal use only. All rights reserved.
