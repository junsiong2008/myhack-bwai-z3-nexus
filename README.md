# NEXUS

AI-enabled ecosystem relationship platform built for [Cradle Fund](https://www.cradle.com.my/) — a Malaysian government-linked startup accelerator. Submitted to **Build With AI MyHack 2026**.

NEXUS automates the manual coordination that breaks down as innovation ecosystems scale: screening hundreds of applicants, matching startups to mentors, and capturing outcome data that would otherwise be discarded after each cohort.

---

## Problem

Three pain points at Cradle's current scale:

| # | Stage | Problem |
|---|---|---|
| P3 | Application screening | Manual review collapses at 300+ applicants |
| P2 | Mentor matching | Relationships exist only in spreadsheets — no history |
| P1 | Outcome capture | All outcome data is discarded after each cohort ends |

---

## Solution

- **Smart Intake** — Gemini 2.0 Flash parses pitch text or PDF decks into structured company profiles (sector, stage, needs, risk flags, match readiness score)
- **AI Matching** — Two-stage engine: sentence-transformer embeddings for candidate retrieval → XGBoost (87% ROC-AUC) for final ranking with SHAP-style explanations
- **Relationship Graph** — Every mentor-company-programme link is stored as a graph edge in Firestore; nothing is discarded
- **Intelligence Flywheel** — Each cohort's outcomes retrain the model, so matching improves over time
- **Programme Pipeline** — Bulk AI-assign, anomaly detection, and end-of-programme outcome capture in one workflow

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS v4 |
| Backend | FastAPI + Uvicorn (Python 3.11) |
| AI — intake | Gemini 2.0 Flash (`google-genai`) |
| AI — matching | XGBoost + `sentence-transformers` (`all-MiniLM-L6-v2`) |
| Orchestration | LangGraph |
| Database | Firestore (Native mode) |
| Graph viz | D3 v7 (force-directed layout) |
| Hosting — frontend | Firebase Hosting |
| Hosting — backend | Google Cloud Run |

---

## Project structure

```
/nexus
├── /frontend          # React 19 + Vite + Tailwind
├── /backend           # FastAPI + XGBoost matching engine
├── /docs              # Full spec and user journey
├── firebase.json
├── DEPLOYMENT.md
└── README.md
```

---

## Getting started

### Prerequisites

- Node.js 18+
- Python 3.11+
- Gemini API key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- Firebase project with Firestore + Hosting enabled (`firebase login`)

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # add GEMINI_API_KEY
uvicorn app.main:app --reload --port 8000
# API docs at http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local    # set VITE_API_BASE_URL=http://localhost:8000
npm run dev                   # http://localhost:5173
```

> The frontend uses fallback fixture data for every endpoint, so the UI works fully even without a running backend.

---

## Environment variables

**`backend/.env`**

```
GEMINI_API_KEY=your_key_here
GOOGLE_CLOUD_PROJECT=your_project_id
FIRESTORE_DATABASE=(default)
```

**`frontend/.env.local`**

```
VITE_API_BASE_URL=http://localhost:8000
```

---

## Key API endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/api/intake` | Gemini parses pitch text → structured company profile |
| `POST` | `/api/intake/pdf` | Gemini Vision reads uploaded PDF pitch deck |
| `POST` | `/api/match` | XGBoost matching engine → ranked mentor list |
| `POST` | `/api/assign` | Approve a match → write edge to Firestore |
| `GET` | `/api/graph/{programme_id}` | Graph nodes + edges for D3 rendering |
| `GET` | `/api/flywheel` | Cohort accuracy history |
| `POST` | `/api/programmes/{id}/end` | Close programme — capture outcomes, queue retraining |
| `GET` | `/api/programmes/{id}/reuse-eligible` | Surface top-performing mentors for next cohort |
| `GET` | `/api/stats` | Dashboard KPIs and model performance metrics |

---

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full Cloud Run and Firebase Hosting instructions.

Quick deploy:

```bash
# Frontend → Firebase Hosting
cd frontend && npm run build && firebase deploy --only hosting

# Backend → Cloud Run
cd backend
gcloud builds submit --tag asia-southeast1-docker.pkg.dev/<project>/nexus-backend/api:latest
gcloud run deploy nexus-backend --image ... --min-instances 1 --memory 1Gi
```

`--min-instances 1` keeps the XGBoost model and embeddings warm in memory — critical for sub-100ms inference during demos.

---

## Model performance

The XGBoost mentor matching model improves as cohort data accumulates:

| Cohort | ROC-AUC | Training records |
|---|---|---|
| Cohort 1 (2023) | 61% | 42 |
| Cohort 2 (2024) | 71% | 98 |
| Cohort 3 (2025) | 79% | 184 |
| Cohort 4 (2026) | **87%** | 268 |

---

## Screens

- **Dashboard** — KPI cards, sector/stage charts, model stats, anomaly alerts
- **Smart Intake** — Pitch text / PDF upload → Gemini-parsed profile card
- **AI Matching** — Company selector → ranked mentor cards with SHAP explanations
- **Programme Pipeline** — Bulk AI-assign, status tracking, end-programme outcome capture
- **Relationship Graph** — D3 force-directed graph of all ecosystem relationships
- **Intelligence Flywheel** — Cohort accuracy trend + leadership impact report
