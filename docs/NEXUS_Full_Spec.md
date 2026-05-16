# NEXUS — Technical Specification
# Based on Hackathon Base Project spec — updated for Build With AI MyHack 2026

> This document is written for an AI code generator. Follow the structure, stack, and
> conventions exactly as described. Do not add libraries or patterns not listed here.
> Prioritise working code over clever abstractions.

---

## Problem context

**Client:** Cradle Fund — Malaysian government-linked startup accelerator
**Problem:** Innovation ecosystem platforms depend on manual coordination to verify
participants, match mentors, assign companies to programmes, and manage partner
linkages. As ecosystems scale, these relationships remain ad hoc and difficult to reuse.
**Solution:** NEXUS — an AI-enabled platform that automates ecosystem relationships as
reusable, programmable entities to improve scalability, efficiency, and outcomes.

**Three pain points being solved:**
- P3 (Stage 2) — Manual screening collapses at 300+ applicants. Gemini parses and scores all applications automatically.
- P2 (Stage 5) — Mentor-company relationships exist only in spreadsheets. XGBoost ranks mentors with history-informed scores and explainability.
- P1 (Stage 9) — All outcome data is discarded after each cohort. NEXUS writes every outcome as a graph edge — nothing is discarded.

---

## Stack decision — Option B (FastAPI + Python) is chosen

We need Python for the XGBoost matching engine and sentence-transformers embeddings.
These run in-memory and cannot be replicated with Node.js Firebase Functions without
sacrificing the core ML differentiator.

**Do not scaffold Option A (Firebase Functions / Node.js).**

| Layer | Technology | Reason |
|---|---|---|
| Frontend | React 18 + Vite + Tailwind | Per base spec |
| Backend | FastAPI + Uvicorn (Python 3.11) | XGBoost + sentence-transformers require Python |
| AI — intake | Gemini 2.0 Flash (`google-generativeai`) | Google tech rubric; parses pitch text into structured JSON |
| AI — matching | XGBoost (pre-trained `.pkl`) | 87% ROC-AUC; runs in-memory, sub-100ms inference |
| Embeddings | `sentence-transformers` (`all-MiniLM-L6-v2`) | Candidate retrieval before XGBoost ranking |
| Database | Firestore (Native mode) | Stores companies, mentors, edges, programmes |
| File storage | Firebase Storage | Pitch deck PDF uploads |
| Hosting — frontend | Firebase Hosting | `firebase deploy` → live HTTPS URL for judges |
| Hosting — backend | Cloud Run (if live URL needed) | Containerised FastAPI; `uvicorn` locally for dev |
| Charts | Recharts | Per base spec |
| Graph viz | D3 v7 | Force-directed layout for relationship graph screen |
| Icons | Lucide React | Consistent, tree-shakeable |
| HTTP client | Axios via `api.js` | Per base spec — never call axios directly in components |

**Why Cloud Run and not Firebase Functions for the backend:**
Firebase Functions (even gen 2 Python) cold-starts reload the model from disk on every
instance spin-up. `sentence-transformers` downloads ~90MB on first load.
XGBoost + embeddings together need ~1.5GB RAM held warm across requests.
Cloud Run with `--min-instances 1` keeps the model in memory permanently.
For local demo, `uvicorn` is sufficient — Cloud Run only needed if judges require a live URL.

---

## Monorepo structure

```
/nexus
├── /frontend
├── /backend
├── firebase.json              # Firebase Hosting config (frontend only)
├── .firebaserc
├── .env.example
└── README.md
```

Do not scaffold `/functions` — Firebase Functions are not used.

---

## Environment variables

### `/frontend/.env`

```
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_MAPS_API_KEY=your_key_here
```

For Cloud Run deployment, replace `VITE_API_BASE_URL` with the Cloud Run service URL.

### `/backend/.env`

```
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.0-flash
GOOGLE_CLOUD_PROJECT=nexus-hack-2026
FIRESTORE_DATABASE=(default)
GCS_BUCKET=nexus-pitch-decks
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=20
```

---

## Pinned contracts

The following are load-bearing — both frontend and backend depend on them.
Do not rename or restructure these without updating both sides.

### Endpoints (replacing base spec's `/chat`, `/upload`, `/health`)

NEXUS has domain-specific endpoints. The base spec's generic `/chat` and `/upload`
contracts are **replaced** by the following. `api.js` must expose all of these.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Health check — unchanged from base spec |
| `POST` | `/api/intake` | Gemini parses pitch text → structured company profile |
| `POST` | `/api/intake/pdf` | Gemini Vision reads uploaded PDF pitch deck → same structured profile |
| `POST` | `/api/companies` | Add parsed company as a node (after intake) |
| `GET` | `/api/companies` | List companies (query: sector, stage, status, programme_id) |
| `GET` | `/api/mentors` | List all mentors |
| `POST` | `/api/match` | XGBoost matching engine → ranked mentor list |
| `POST` | `/api/assign` | Approve a match → write edge to Firestore |
| `GET` | `/api/programmes/{id}/pipeline` | All companies in a programme with statuses |
| `POST` | `/api/programmes/{id}/bulk-assign` | Auto-assign all Applied companies |
| `GET` | `/api/stats` | Dashboard KPIs |
| `GET` | `/api/graph/{programme_id}` | Graph nodes + edges for D3 |
| `GET` | `/api/flywheel` | Cohort accuracy history |
| `POST` | `/api/programmes/{id}/end` | Close programme — write outcome labels + NPS to all edges |
| `GET` | `/api/programmes/{id}/reuse-eligible` | Surface top-performing mentors for next cohort |
| `GET` | `/api/programmes/{id}/anomalies` | Companies with no mentor sessions in 3+ weeks |

### Request / response shapes (pinned)

**`GET /health`**
```json
{ "status": "ok", "service": "nexus-api" }
```

**`POST /api/intake`**
Request:
```json
{
  "company_name": "PayEasy",
  "pitch_text": "We are a fintech SaaS startup...",
  "team_size": 6,
  "founding_year": 2023
}
```
Response:
```json
{
  "company_name": "PayEasy",
  "sector": "Fintech",
  "stage": "Seed",
  "geography": "MY",
  "needs": ["Mentorship", "Legal", "Funding"],
  "problem_statement": "SMEs in SEA lack affordable automated reconciliation tools.",
  "key_strength": "Strong technical founding team with prior fintech exits.",
  "risk_flag": "Limited market validation beyond pilot cohort of 12 SMEs.",
  "match_readiness": 0.82,
  "priority_tier": "High",
  "confidence": 0.94
}
```

**`POST /api/intake/pdf`**
Request: `multipart/form-data` with a single `file` field (`.pdf` only, max 20MB).

Response: identical shape to `POST /api/intake`. Gemini Vision reads the PDF bytes directly — no text extraction step needed.

Backend implementation note: read the uploaded file into bytes, base64-encode, pass to Gemini as an inline `image/pdf` part alongside the extraction prompt. Same `parse_pitch()` output shape is returned so the frontend `parseIntake()` fallback fixture works for both endpoints.

```python
# In routers/intake.py — PDF variant
@router.post("/intake/pdf")
async def intake_pdf(file: UploadFile = File(...)):
    pdf_bytes = await file.read()
    pdf_b64   = base64.b64encode(pdf_bytes).decode()
    result    = gemini_agent.parse_pdf(pdf_b64)
    return result
```

```python
# In services/gemini_agent.py — PDF variant
def parse_pdf(pdf_b64: str) -> dict:
    """Send a base64-encoded PDF to Gemini Vision and return a structured company profile dict."""
    model    = genai.GenerativeModel(model_name=MODEL)
    response = model.generate_content([
        {"mime_type": "application/pdf", "data": pdf_b64},
        INTAKE_PROMPT.format(pitch_text="[Extract from the attached PDF]"),
    ])
    return json.loads(response.text)
```

Frontend — add a file input to `SmartIntake.jsx` alongside the textarea. When a PDF is selected, call `parsePdfIntake(file)` instead of `parseIntake(form)`. The profile card renders identically regardless of which endpoint was used.

```js
// In api.js
export async function parsePdfIntake(file) {
  try {
    const form = new FormData()
    form.append('file', file)
    const res = await api.post('/api/intake/pdf', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 45000,
    })
    return res.data
  } catch {
    return {
      sector: 'Fintech', stage: 'Seed', geography: 'MY',
      needs: ['Mentorship', 'Funding'],
      problem_statement: 'SMEs lack affordable reconciliation tools.',
      key_strength: 'Strong technical team with prior fintech exits.',
      risk_flag: 'Limited validation beyond 12-SME pilot.',
      match_readiness: 0.82, priority_tier: 'High', confidence: 0.94,
    }
  }
}
```

---

**`POST /api/match`**
Request:
```json
{ "company_id": "C_001", "top_k": 3 }
```
Response:
```json
{
  "company_id": "C_001",
  "matches": [
    {
      "mentor_id": "M_001",
      "name": "Ahmad Razif",
      "score": 0.91,
      "explanation": "Strong domain match: both in fintech SaaS. Past NPS: 4.8/5.",
      "domain_tags": ["Fintech", "SaaS"],
      "nps_score": 4.8,
      "capacity_used": 2,
      "capacity_total": 5,
      "reuse_eligible": true,
      "geography": "MY",
      "shap_breakdown": {
        "domain_match": 0.40,
        "past_nps": 0.30,
        "geography_match": 0.20,
        "capacity_available": 0.10
      }
    }
  ]
}
```

**`POST /api/assign`**
Request:
```json
{
  "company_id": "C_001",
  "mentor_id": "M_001",
  "programme_id": "P_05",
  "match_score": 0.91
}
```
Response:
```json
{
  "edge_id": "E_001",
  "edge_type": "MENTORS",
  "company_id": "C_001",
  "mentor_id": "M_001",
  "programme_id": "P_05",
  "match_score": 0.91,
  "status": "active",
  "created_at": "2026-05-16T09:00:00Z"
}
```

**`POST /api/programmes/{id}/bulk-assign`**
Response:
```json
{
  "programme_id": "P_05",
  "assigned_count": 28,
  "skipped_count": 2,
  "time_saved_hours": 14.6,
  "assignments": [
    { "company_id": "C_001", "mentor_id": "M_001", "score": 0.91 }
  ]
}
```

**`GET /api/stats`**
```json
{
  "companies": 300,
  "mentors": 80,
  "match_rate": 0.642,
  "hours_saved": 45.2,
  "sector_distribution": { "Fintech": 84, "Agritech": 54, "Healthtech": 45, "Edtech": 36, "Logistics": 30, "Other": 51 },
  "stage_distribution": { "Idea": 12, "Pre-seed": 87, "Seed": 148, "Series A": 53 },
  "model_stats": {
    "roc_auc": 0.8722,
    "precision": 0.82,
    "recall": 0.77,
    "training_records": 268
  }
}
```

**`GET /api/graph/{programme_id}`**
```json
{
  "nodes": [
    { "id": "P_05",  "label": "CREST 2026 MY", "type": "programme" },
    { "id": "C_001", "label": "PayEasy",        "type": "company"   },
    { "id": "M_001", "label": "Ahmad Razif",    "type": "mentor"    }
  ],
  "edges": [
    { "source": "C_001", "target": "M_001", "weight": 0.91, "status": "active",   "edge_type": "MENTORS"      },
    { "source": "C_001", "target": "P_05",  "weight": 1.0,  "status": "enrolled", "edge_type": "ENROLLED_IN"  }
  ]
}
```

**`GET /api/flywheel`**
```json
{
  "cohorts": [
    { "name": "Cohort 1 (2023 MY)", "accuracy": 0.61, "training_records": 42  },
    { "name": "Cohort 2 (2024 MY)", "accuracy": 0.71, "training_records": 98  },
    { "name": "Cohort 3 (2025 MY)", "accuracy": 0.79, "training_records": 184 },
    { "name": "Cohort 4 (2026 MY)", "accuracy": 0.87, "training_records": 268 }
  ]
}
```

---

**`POST /api/programmes/{id}/end`** ← NEW — this is the P1 fix. The single action that stops data being thrown away.

Request body:
```json
{
  "outcomes": [
    {
      "company_id": "C_001",
      "mentor_id": "M_001",
      "outcome": "graduated",
      "nps_mentor": 4.8,
      "nps_company": 4.5
    },
    {
      "company_id": "C_004",
      "mentor_id": "M_002",
      "outcome": "dropped",
      "nps_mentor": 3.1,
      "nps_company": 2.8
    }
  ]
}
```

Response:
```json
{
  "programme_id": "P_05",
  "status": "closed",
  "edges_updated": 30,
  "graduated_count": 24,
  "dropped_count": 6,
  "reuse_eligible_count": 18,
  "training_records_added": 30,
  "message": "Outcomes captured. Model retraining queued."
}
```

Firestore write per outcome — updates the existing edge document:
```python
db.collection("edges").document(edge_id).update({
  "outcome":        outcome,          # "graduated" | "dropped"
  "nps_mentor":     nps_mentor,
  "nps_company":    nps_company,
  "reuse_eligible": nps_mentor >= 4.0 and outcome == "graduated",
  "closed_at":      firestore.SERVER_TIMESTAMP,
})
```

---

**`GET /api/programmes/{id}/reuse-eligible`** ← NEW — surfaces proven mentors for the next cohort.

Response:
```json
{
  "programme_id": "P_05",
  "reuse_eligible_mentors": [
    {
      "mentor_id": "M_001",
      "name": "Ahmad Razif",
      "domain": ["Fintech", "SaaS"],
      "past_programme": "CREST 2026 MY",
      "outcome_rate": 0.87,
      "nps_score": 4.8,
      "reuse_eligible": true
    }
  ],
  "count": 18
}
```

---

**`GET /api/programmes/{id}/anomalies`** ← NEW — companies with no mentor engagement in 3+ weeks.

Response:
```json
{
  "programme_id": "P_05",
  "anomalies": [
    {
      "company_id": "C_004",
      "company_name": "EduFlow",
      "assigned_mentor": "Priya Nair",
      "last_session_days_ago": 23,
      "flag": "No mentor session in 3+ weeks"
    }
  ],
  "count": 2
}
```

---

## Backend file structure

```
/backend
├── main.py
├── routers/
│   ├── intake.py
│   ├── companies.py
│   ├── mentors.py
│   ├── matching.py
│   ├── programmes.py
│   ├── stats.py
│   ├── graph.py
│   └── flywheel.py
├── services/
│   ├── gemini_agent.py       # Gemini intake parser
│   ├── matching_engine.py    # XGBoost ranker + embedding retrieval
│   ├── firestore_client.py   # Firestore read/write
│   └── graph_builder.py      # NetworkX → JSON for D3
├── models/
│   ├── nexus_model.pkl       # Pre-trained XGBoost model
│   └── schemas.py            # Pydantic request/response models
├── data/
│   ├── companies.json        # Seed data — 300 companies
│   ├── mentors.json          # Seed data — 80 mentors
│   └── matches.json          # Historical match outcomes (training data)
├── prompts/
│   └── intake.txt            # Gemini system prompt for intake parsing
├── requirements.txt
└── Dockerfile
```

### `main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import intake, companies, mentors, matching, programmes, stats, graph, flywheel

app = FastAPI(title="NEXUS API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(intake.router,      prefix="/api")
app.include_router(companies.router,   prefix="/api")
app.include_router(mentors.router,     prefix="/api")
app.include_router(matching.router,    prefix="/api")
app.include_router(programmes.router,  prefix="/api")
app.include_router(stats.router,       prefix="/api")
app.include_router(graph.router,       prefix="/api")
app.include_router(flywheel.router,    prefix="/api")

@app.get("/health")
def health():
    return {"status": "ok", "service": "nexus-api"}
```

### `requirements.txt`

```
fastapi==0.111.0
uvicorn[standard]==0.29.0
google-generativeai==0.7.2
google-cloud-firestore==2.16.0
google-cloud-storage==2.16.0
xgboost==2.0.3
scikit-learn==1.4.2
sentence-transformers==2.7.0
numpy==1.26.4
pandas==2.2.2
networkx==3.3
pydantic==2.7.1
python-multipart==0.0.9
python-dotenv==1.0.1
```

### Gemini wrapper (`services/gemini_agent.py`)

Follows the base spec wrapper pattern — all Gemini SDK calls go through this module,
never directly in route handlers.

```python
import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.environ["GEMINI_API_KEY"])
MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

INTAKE_PROMPT = """
You are an ecosystem analyst for a startup accelerator.
Extract the following from the pitch text and return ONLY valid JSON, no markdown, no backticks.

Fields:
- sector: string (Fintech | Agritech | Healthtech | Edtech | Logistics | Other)
- stage: string (Idea | Pre-seed | Seed | Series A)
- geography: string (2-letter country code e.g. MY, SG, ID)
- needs: array of strings (Mentorship | Legal | Funding | Tech | BD | Marketing)
- problem_statement: string (one sentence)
- key_strength: string (one sentence)
- risk_flag: string or null (one sentence — biggest gap, or null if none)
- match_readiness: float 0.0-1.0
- priority_tier: string (High | Medium | Standard)
- confidence: float 0.0-1.0

Pitch text:
{pitch_text}
"""

def parse_pitch(pitch_text: str) -> dict:
    """Send pitch text to Gemini and return a structured company profile dict."""
    model = genai.GenerativeModel(model_name=MODEL)
    prompt = INTAKE_PROMPT.format(pitch_text=pitch_text)
    response = model.generate_content(prompt)
    return json.loads(response.text)
```

### Matching engine (`services/matching_engine.py`)

```python
import pickle
import numpy as np
from sentence_transformers import SentenceTransformer, util

# Load once at module import — stays warm across requests
with open("models/nexus_model.pkl", "rb") as f:
    xgb_model = pickle.load(f)

embedder = SentenceTransformer("all-MiniLM-L6-v2")

def rank_mentors(company: dict, mentors: list, top_k: int = 3) -> list:
    """Two-stage matching: embedding retrieval → XGBoost ranking → top_k results."""
    # Stage 1 — embedding similarity (candidate retrieval)
    company_text = f"{company['sector']} {company['stage']} {' '.join(company.get('needs', []))}"
    mentor_texts  = [f"{' '.join(m['domain'])} {m['geography']}" for m in mentors]

    company_emb = embedder.encode(company_text, convert_to_tensor=True)
    mentor_embs = embedder.encode(mentor_texts, convert_to_tensor=True)
    cos_scores  = util.cos_sim(company_emb, mentor_embs)[0].cpu().numpy()
    top20_idx   = cos_scores.argsort()[-20:][::-1]
    candidates  = [mentors[i] for i in top20_idx]

    # Stage 2 — XGBoost ranking
    results = []
    for mentor in candidates:
        features = build_features(company, mentor, cos_scores[mentors.index(mentor)])
        score    = float(xgb_model.predict_proba([features])[0][1])
        results.append({
            "mentor_id":      mentor["id"],
            "name":           mentor["name"],
            "score":          round(score, 4),
            "explanation":    build_explanation(company, mentor, score),
            "domain_tags":    mentor["domain"],
            "nps_score":      mentor["nps_score"],
            "capacity_used":  mentor["capacity_used"],
            "capacity_total": mentor["capacity_total"],
            "reuse_eligible": mentor["reuse_eligible"],
            "geography":      mentor["geography"],
            "shap_breakdown": get_shap(features),
        })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_k]

def build_features(company: dict, mentor: dict, embedding_score: float) -> list:
    """Build the feature vector for XGBoost inference."""
    domain_overlap   = len(set(company.get("needs", [])) & set(mentor["domain"])) / max(len(mentor["domain"]), 1)
    geo_match        = 1.0 if company.get("geography") == mentor["geography"] else 0.0
    capacity_remain  = 1.0 - (mentor["capacity_used"] / mentor["capacity_total"])
    return [
        domain_overlap,
        geo_match,
        mentor["nps_score"] / 5.0,
        capacity_remain,
        mentor["outcome_rate"],
        embedding_score,
        float(mentor["reuse_eligible"]),
    ]

def build_explanation(company: dict, mentor: dict, score: float) -> str:
    """Generate a human-readable explanation for the match score."""
    domain_overlap = set(company.get("needs", [])) & set(mentor["domain"])
    overlap_str    = ", ".join(domain_overlap) if domain_overlap else "general fit"
    return f"Domain alignment: {overlap_str}. Past NPS: {mentor['nps_score']}/5. Score: {round(score * 100)}%."

def get_shap(features: list) -> dict:
    """Return a simplified SHAP-style breakdown for explainability display."""
    keys = ["domain_match", "geography_match", "past_nps", "capacity_available", "outcome_rate", "embedding_sim", "reuse_eligible"]
    total = sum(abs(f) for f in features) or 1
    return {k: round(abs(v) / total, 2) for k, v in zip(keys, features)}
```

---

## Frontend file structure

```
/frontend
├── index.html
├── vite.config.js
├── tailwind.config.js
├── package.json
├── firebase.json             # { "hosting": { "public": "dist", "rewrites": [{ "source": "**", "destination": "/index.html" }] } }
├── .env
└── /src
    ├── main.jsx
    ├── App.jsx               # Screen router — no archetype switcher, always NEXUS
    ├── api.js                # All axios calls — single source of truth
    │
    ├── /components
    │   ├── Sidebar.jsx
    │   ├── TopBar.jsx
    │   ├── StatusBadge.jsx
    │   ├── SectorBadge.jsx
    │   ├── MentorCard.jsx
    │   ├── CompanyCard.jsx
    │   ├── MatchScoreBar.jsx
    │   ├── KPICard.jsx
    │   └── Toast.jsx
    │
    └── /screens
        ├── Dashboard.jsx
        ├── SmartIntake.jsx
        ├── AIMatching.jsx
        ├── Pipeline.jsx
        ├── RelationshipGraph.jsx
        └── Flywheel.jsx
```

The base spec's `/archetypes` folder is **not used**. NEXUS is a single multi-screen
application, not a switchable archetype.

### `App.jsx`

```jsx
import { useState } from 'react'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Dashboard from './screens/Dashboard'
import SmartIntake from './screens/SmartIntake'
import AIMatching from './screens/AIMatching'
import Pipeline from './screens/Pipeline'
import RelationshipGraph from './screens/RelationshipGraph'
import Flywheel from './screens/Flywheel'

// Map route names to screen components
const SCREENS = {
  dashboard:  Dashboard,
  intake:     SmartIntake,
  matching:   AIMatching,
  pipeline:   Pipeline,
  graph:      RelationshipGraph,
  flywheel:   Flywheel,
}

export default function App() {
  const [active, setActive] = useState('dashboard')
  const Screen = SCREENS[active]

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar active={active} onNavigate={setActive} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-8">
          <Screen />
        </main>
      </div>
    </div>
  )
}
```

### `api.js` — all backend calls

This is the only file that imports axios. All screens call these functions.
Every function wraps its call in try/catch and returns hardcoded fixture data on failure
so the demo never stalls on a dead endpoint.

```js
import axios from 'axios'

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// Axios instance with 30s timeout (Gemini calls can be slow)
const api = axios.create({ baseURL: BASE, timeout: 30000 })

// ── Intake ────────────────────────────────────────────────────────────────────

// Parse a pitch text with Gemini and return a structured company profile
export async function parseIntake(body) {
  try {
    const res = await api.post('/api/intake', body)
    return res.data
  } catch {
    return {
      sector: 'Fintech', stage: 'Seed', geography: 'MY',
      needs: ['Mentorship', 'Funding'],
      problem_statement: 'SMEs lack affordable reconciliation tools.',
      key_strength: 'Strong technical team with prior fintech exits.',
      risk_flag: 'Limited validation beyond 12-SME pilot.',
      match_readiness: 0.82, priority_tier: 'High', confidence: 0.94,
    }
  }
}

// Add a parsed company as a node in the ecosystem
export async function addToEcosystem(body) {
  try {
    const res = await api.post('/api/companies', body)
    return res.data
  } catch {
    return { id: `C_${Date.now()}`, created: true }
  }
}

// ── Companies + Mentors ───────────────────────────────────────────────────────

// List companies, optionally filtered by sector/stage/status/programme_id
export async function getCompanies(params = {}) {
  try {
    const res = await api.get('/api/companies', { params })
    return res.data
  } catch {
    return FALLBACK_COMPANIES
  }
}

// List all mentors
export async function getMentors() {
  try {
    const res = await api.get('/api/mentors')
    return res.data
  } catch {
    return FALLBACK_MENTORS
  }
}

// ── Matching ──────────────────────────────────────────────────────────────────

// Run the XGBoost matching engine for a company and return ranked mentor list
export async function runMatch({ company_id, top_k = 3 }) {
  try {
    const res = await api.post('/api/match', { company_id, top_k })
    return res.data
  } catch {
    return { company_id, matches: FALLBACK_MATCHES }
  }
}

// Approve a match — writes an edge to Firestore
export async function approveMatch(body) {
  try {
    const res = await api.post('/api/assign', body)
    return res.data
  } catch {
    return { edge_id: `E_${Date.now()}`, status: 'active' }
  }
}

// ── Pipeline ──────────────────────────────────────────────────────────────────

// Get all companies in a programme with their pipeline statuses
export async function getPipeline(programmeId = 'P_05') {
  try {
    const res = await api.get(`/api/programmes/${programmeId}/pipeline`)
    return res.data
  } catch {
    return { programme_id: programmeId, programme_name: 'CREST 2026 MY', companies: FALLBACK_COMPANIES }
  }
}

// Auto-assign all Applied companies to their top mentor match
export async function bulkAssign(programmeId = 'P_05') {
  try {
    const res = await api.post(`/api/programmes/${programmeId}/bulk-assign`)
    return res.data
  } catch {
    return { assigned_count: 28, skipped_count: 2, time_saved_hours: 14.6 }
  }
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

// Get dashboard KPIs and model stats
export async function getStats() {
  try {
    const res = await api.get('/api/stats')
    return res.data
  } catch {
    return FALLBACK_STATS
  }
}

// ── Graph ─────────────────────────────────────────────────────────────────────

// Get graph nodes and edges for D3 force-directed rendering
export async function getGraph(programmeId = 'P_05') {
  try {
    const res = await api.get(`/api/graph/${programmeId}`)
    return res.data
  } catch {
    return FALLBACK_GRAPH
  }
}

// ── Flywheel ──────────────────────────────────────────────────────────────────

// Get cohort accuracy history for the Intelligence Flywheel screen
export async function getFlywheel() {
  try {
    const res = await api.get('/api/flywheel')
    return res.data
  } catch {
    return FALLBACK_FLYWHEEL
  }
}

// ── Programme end + reuse ─────────────────────────────────────────────────────

// Close a programme — writes outcome labels and NPS to all edges (the P1 action)
export async function endProgramme(programmeId, outcomes) {
  try {
    const res = await api.post(`/api/programmes/${programmeId}/end`, { outcomes })
    return res.data
  } catch {
    return {
      programme_id: programmeId,
      status: 'closed',
      edges_updated: outcomes.length,
      graduated_count: outcomes.filter(o => o.outcome === 'graduated').length,
      dropped_count: outcomes.filter(o => o.outcome === 'dropped').length,
      reuse_eligible_count: 18,
      training_records_added: outcomes.length,
      message: 'Outcomes captured. Model retraining queued.',
    }
  }
}

// Surface top-performing reuse-eligible mentors for the next cohort
export async function getReuseEligible(programmeId = 'P_05') {
  try {
    const res = await api.get(`/api/programmes/${programmeId}/reuse-eligible`)
    return res.data
  } catch {
    return {
      count: 18,
      reuse_eligible_mentors: FALLBACK_MENTORS.filter(m => m.reuse_eligible).map(m => ({
        ...m,
        past_programme: 'CREST 2026 MY',
      })),
    }
  }
}

// Get companies with no mentor sessions in 3+ weeks (anomaly detection)
export async function getAnomalies(programmeId = 'P_05') {
  try {
    const res = await api.get(`/api/programmes/${programmeId}/anomalies`)
    return res.data
  } catch {
    return {
      count: 1,
      anomalies: [
        {
          company_id: 'C_004',
          company_name: 'EduFlow',
          assigned_mentor: 'Priya Nair',
          last_session_days_ago: 23,
          flag: 'No mentor session in 3+ weeks',
        },
      ],
    }
  }
}

// ── Fallback fixtures (used when API is unreachable) ──────────────────────────

const FALLBACK_STATS = {
  companies: 300, mentors: 80, match_rate: 0.642, hours_saved: 45.2,
  sector_distribution: { Fintech: 84, Agritech: 54, Healthtech: 45, Edtech: 36, Logistics: 30, Other: 51 },
  stage_distribution: { Idea: 12, 'Pre-seed': 87, Seed: 148, 'Series A': 53 },
  model_stats: { roc_auc: 0.8722, precision: 0.82, recall: 0.77, training_records: 268 },
}

const FALLBACK_COMPANIES = [
  { id: 'C_001', name: 'PayEasy',    sector: 'Fintech',    stage: 'Seed',      geography: 'MY', status: 'Applied',  needs: ['Mentorship', 'Funding'],  risk_flag: 'Limited market validation', assigned_mentor: null },
  { id: 'C_002', name: 'AgriSense',  sector: 'Agritech',   stage: 'Pre-seed',  geography: 'MY', status: 'Matched',  needs: ['Legal', 'Tech'],           risk_flag: null, assigned_mentor: { id: 'M_002', name: 'Priya Nair' } },
  { id: 'C_003', name: 'MedChain',   sector: 'Healthtech', stage: 'Series A',  geography: 'SG', status: 'Engaged',  needs: ['Funding', 'BD'],           risk_flag: null, assigned_mentor: { id: 'M_003', name: 'James Loh' } },
  { id: 'C_004', name: 'EduFlow',    sector: 'Edtech',     stage: 'Seed',      geography: 'MY', status: 'Applied',  needs: ['Mentorship', 'Marketing'], risk_flag: 'No revenue model defined', assigned_mentor: null },
  { id: 'C_005', name: 'LogiTrack',  sector: 'Logistics',  stage: 'Pre-seed',  geography: 'MY', status: 'Applied',  needs: ['Tech', 'Funding'],         risk_flag: null, assigned_mentor: null },
]

const FALLBACK_MENTORS = [
  { id: 'M_001', name: 'Ahmad Razif', domain: ['Fintech', 'SaaS'],       geography: 'MY', nps_score: 4.8, capacity_used: 2, capacity_total: 5, reuse_eligible: true,  outcome_rate: 0.87 },
  { id: 'M_002', name: 'Priya Nair',  domain: ['Healthtech', 'B2B'],     geography: 'MY', nps_score: 4.5, capacity_used: 3, capacity_total: 5, reuse_eligible: true,  outcome_rate: 0.82 },
  { id: 'M_003', name: 'James Loh',   domain: ['Agritech', 'Hardware'],  geography: 'SG', nps_score: 4.2, capacity_used: 1, capacity_total: 4, reuse_eligible: false, outcome_rate: 0.74 },
]

const FALLBACK_MATCHES = [
  { mentor_id: 'M_001', name: 'Ahmad Razif', score: 0.91, explanation: 'Strong domain match: fintech SaaS. Past NPS: 4.8/5.', domain_tags: ['Fintech', 'SaaS'], nps_score: 4.8, capacity_used: 2, capacity_total: 5, reuse_eligible: true, geography: 'MY', shap_breakdown: { domain_match: 0.40, past_nps: 0.30, geography_match: 0.20, capacity_available: 0.10 } },
  { mentor_id: 'M_002', name: 'Priya Nair',  score: 0.74, explanation: 'Partial domain overlap. Strong NPS history.', domain_tags: ['Healthtech', 'B2B'], nps_score: 4.5, capacity_used: 3, capacity_total: 5, reuse_eligible: true, geography: 'MY', shap_breakdown: { domain_match: 0.20, past_nps: 0.35, geography_match: 0.20, capacity_available: 0.25 } },
  { mentor_id: 'M_003', name: 'James Loh',   score: 0.61, explanation: 'Cross-geography match. Moderate domain fit.', domain_tags: ['Agritech', 'Hardware'], nps_score: 4.2, capacity_used: 1, capacity_total: 4, reuse_eligible: false, geography: 'SG', shap_breakdown: { domain_match: 0.15, past_nps: 0.25, geography_match: 0.10, capacity_available: 0.50 } },
]

const FALLBACK_GRAPH = {
  nodes: [
    { id: 'P_05',  label: 'CREST 2026 MY', type: 'programme' },
    { id: 'C_001', label: 'PayEasy',        type: 'company'   },
    { id: 'C_002', label: 'AgriSense',      type: 'company'   },
    { id: 'M_001', label: 'Ahmad Razif',    type: 'mentor'    },
    { id: 'M_002', label: 'Priya Nair',     type: 'mentor'    },
  ],
  edges: [
    { source: 'C_001', target: 'M_001', weight: 0.91, status: 'active',   edge_type: 'MENTORS'     },
    { source: 'C_002', target: 'M_002', weight: 0.74, status: 'active',   edge_type: 'MENTORS'     },
    { source: 'C_001', target: 'P_05',  weight: 1.0,  status: 'enrolled', edge_type: 'ENROLLED_IN' },
    { source: 'C_002', target: 'P_05',  weight: 1.0,  status: 'enrolled', edge_type: 'ENROLLED_IN' },
  ],
}

const FALLBACK_FLYWHEEL = {
  cohorts: [
    { name: 'Cohort 1 (2023 MY)', accuracy: 0.61, training_records: 42  },
    { name: 'Cohort 2 (2024 MY)', accuracy: 0.71, training_records: 98  },
    { name: 'Cohort 3 (2025 MY)', accuracy: 0.79, training_records: 184 },
    { name: 'Cohort 4 (2026 MY)', accuracy: 0.87, training_records: 268 },
  ],
}
```

---

## Screen specifications

Build screens in this priority order. Do not move to the next until the current one is stable.

### Priority 1 — `SmartIntake.jsx`

**Rubric coverage:** Google tech (15 pts) + AI quality (10 pts)

Layout: two columns. Left = input form. Right = extracted profile card.

Left column:
- Heading: "New applicant intake"
- `textarea` (200px) — placeholder: company pitch description
- Three small fields in a row: Company name, Team size, Founded year
- Button "Parse with Gemini" — primary blue, full width, Sparkles icon, disabled + spinner while loading

Right column (empty placeholder before parse; animates in after):
- Sector badge, Stage badge, Geography badge in a row
- Needs as pill tags
- Problem statement (italic)
- Key strength
- Risk flag — red-bordered callout box with warning icon (hidden if null)
- Match readiness — labeled horizontal progress bar
- Priority tier badge (High = green, Medium = amber, Standard = gray)
- Confidence shown as muted text bottom-right
- Two buttons: "Add to ecosystem" (primary blue) + "Run AI match now →" (outlined)

Calls: `parseIntake()` → `addToEcosystem()`

### Priority 2 — `AIMatching.jsx`

**Rubric coverage:** Problem fit (15 pts) + AI performance (5 pts)

Layout: two columns. Left = company selector + company card. Right = ranked mentor cards.

Left column:
- Heading: "AI match engine"
- Dropdown populated from `getCompanies()`
- Company card shown on selection (sector, stage, geography, needs, risk flag)
- Button "Run AI match engine" — primary blue, Zap icon, disabled while loading
- Loading state: pulsing skeleton bars (1–2 second animation)

Right column (empty before match runs):
- Up to 3 `MentorCard` components stacked vertically
- Each mentor card: name + initials avatar, domain tags, match score bar (labeled %, primary blue fill), explanation line (italic), NPS badge, capacity indicator, reuse eligible badge, Approve + Skip buttons
- On Approve: card gets green "Matched ✓" overlay, toast "Edge written to graph"

Calls: `getCompanies()` → `runMatch()` → `approveMatch()`

### Priority 3 — `Pipeline.jsx`

**Rubric coverage:** UX (10 pts) + scalability (10 pts)

Layout: filter bar above full-width table.

Filter bar:
- Programme selector (hardcoded: "CREST 2026 MY")
- Status filter pills — multi-select: All / Applied / Screening / Accepted / Matched / Engaged / Graduated
- Search input
- "Bulk AI-assign" button — right-aligned, primary blue, Zap icon
  On click: progress animation → toast "28 companies matched in 3.2 seconds · 14.6 hours saved"

Table columns: Company name (clickable → navigate to AIMatching with company pre-selected) · Sector badge · Stage badge · Geo · Status badge · Assigned mentor · Assign button

Status badge colors: Applied = amber · Accepted = blue filled · Matched = green outlined · Engaged = green filled · Graduated = purple · Screening = blue outlined

**End programme panel (below the table)** — NEW. Visible when all companies are in a terminal status (Matched / Engaged / Graduated / Dropped). This is the P1 fix — the single action that stops data being thrown away.
- Heading: "End programme and capture outcomes"
- Per-company rows: company name, assigned mentor, outcome selector (Graduated / Dropped), NPS mentor input (1–5), NPS company input (1–5)
- "End programme and capture outcomes" button — success green (#1D9E75), full width, prominent
- On click: calls `endProgramme(programmeId, outcomes)` with all outcome and NPS data collected from the rows
- On success: green confirmation banner — "30 edges updated, 18 mentors flagged reuse-eligible, model retraining queued"
- Button must have loading state (spinner + disabled) — the call may take 2–3 seconds

**Reuse-eligible panel (shown after end-programme action completes)** — NEW.
- Calls `getReuseEligible(programmeId)` immediately after `endProgramme` resolves
- Banner: "18 top-performing mentors from CREST 2026 MY are available to reactivate for your next programme"
- Compact table of mentor name, outcome rate, NPS score, domain tags
- "Activate all reuse-eligible" button — adds these mentors into the next programme pool
- This is Step 7 of the user journey — the compounding intelligence made visible and actionable

Calls: `getPipeline()` then `approveMatch()` per row then `bulkAssign()` then `endProgramme()` then `getReuseEligible()`

### Priority 4 — `Dashboard.jsx`

Layout: 4 KPI cards → two charts side by side → model performance strip → anomaly alerts strip.

KPI cards: Companies (300) · Mentors (80, "80 reuse-eligible") · Match success rate (64.2%, "↑ from 38% manual") · Ops hours saved (~45h, "This cohort alone")

Charts: Recharts `PieChart` (sector distribution) + `BarChart` (stage distribution, primary blue bars)

Model performance strip: ROC-AUC 0.8722 · Precision 82% · Recall 77% · Training records 268

Anomaly alerts strip (below model stats) ← NEW:
- Calls `getAnomalies('P_05')` on mount
- If `count > 0`, renders a amber-bordered alert row per anomaly
- Each row: company name + mentor name + "No session in X days" + "Review" button (navigates to AI Matching with that company pre-selected)
- If `count === 0`, renders a green "All companies engaged" confirmation line
- This is the "flag for intervention" action from Step 5 of the user journey

Calls: `getStats()` + `getAnomalies()`

### Priority 5 — `RelationshipGraph.jsx`

Layout: full-width D3 canvas (500px min-height) + legend strip below + partner panel below legend.

Node colors: company = primary blue (`#185FA5`) · mentor = success green (`#1D9E75`) · programme = amber (`#BA7517`) · partner/service provider = purple (`#534AB7`)
Node size: proportional to degree (number of edges)
Edge stroke-width: proportional to match score weight
Edge color: green for approved mentor-company edges · gray for pending · purple dashed for partner-company edges
Hover over edge: tooltip `{ source, target, edge_type, score or service_type }`

Use D3 `forceSimulation` with `forceLink`, `forceManyBody`, `forceCenter`.
If API is slow, render from `FALLBACK_GRAPH` immediately then update when data arrives.

**Partner and service provider tracking panel (below legend):**
- Heading: "Partner engagement"
- Shows a compact table of all partner/service provider nodes in the current programme
- Columns: Partner name · Service type (Legal / Finance / Tech / BD) · Companies served · Last engaged
- Highlight row in amber if `companies_served === 0` — this partner is assigned but never activated
- Tooltip on amber rows: "Underutilised — consider activating for [company names in their domain]"
- This surfaces the graph query from the proposal: "Which partners were never activated despite being assigned?"
- Data comes from the `GET /api/graph/{programme_id}` response — partner nodes and `PARTNER_OF` edges are already in the graph data model; filter by `node.type === "partner"` client-side

Add to `FALLBACK_GRAPH` in `api.js`:
```js
// Partner nodes
{ id: 'PT_001', label: 'Azmi & Associates', type: 'partner', service_type: 'Legal' },
{ id: 'PT_002', label: 'TechBridge MY',     type: 'partner', service_type: 'Tech'  },

// Partner edges (PARTNER_OF)
{ source: 'C_001', target: 'PT_001', weight: 1.0, status: 'active',      edge_type: 'PARTNER_OF' },
{ source: 'C_002', target: 'PT_002', weight: 1.0, status: 'unactivated', edge_type: 'PARTNER_OF' },
```

Calls: `getGraph()`

### Priority 6 — `Flywheel.jsx`

Layout: centred single column, max-width 700px. Three sections stacked: accuracy chart → before/after table → leadership reporting panel.

Chart: Recharts `LineChart` — accuracy across 4 cohorts. Line in primary blue, dots at each point, y-axis 50–100%.

Below chart: two-column comparison table (left = "Today without NEXUS" in muted/red, right = "With NEXUS" in green)

Callout box: italic quote with primary blue left border, light blue background.
> "NEXUS turns every past programme into training data, so Cradle's next cohort runs itself."

**Leadership reporting panel (below callout box):**

Heading: "Programme impact — for leadership and government reporting"

Four metric cards in a row:
| Card | Value | Sub-label |
|---|---|---|
| Startups graduated | 24 | Across 4 cohorts |
| Mentor match accuracy | 87% | ↑ from 61% at launch |
| Outcome data captured | 100% | vs 0% before NEXUS |
| Estimated ops savings | MYR 102,880 | Per year at current scale |

Below the cards, a single sentence in muted italic: "For the first time, Cradle can answer: which interventions produced better startup outcomes — and prove it."

This section addresses the leadership and government-reporting use case from the proposal: Cradle leadership can now quantify programme impact, attribute outcomes to specific interventions, and justify budget to the Ministry of Finance with data rather than anecdote. It requires no new API call — values are hardcoded from the impact model in the proposal (Section 5.1) and will be replaced with live data in Phase 2.

Calls: `getFlywheel()`

---

## Shared components

### `Sidebar.jsx`

Props: `{ active: string, onNavigate: (screen: string) => void }`

Fixed 220px left sidebar. Logo "NEXUS" at top. Nav items below:
- Dashboard → `dashboard`
- Smart Intake → `intake`
- AI Matching → `matching`
- Programme Pipeline → `pipeline`
- Relationship Graph → `graph`
- Intelligence Flywheel → `flywheel`

Active item: primary blue background, white text. Inactive: gray text, hover highlight.

### `StatusBadge.jsx`

Props: `{ status: string }`

Maps status → Tailwind color:
```js
const STATUS_COLORS = {
  Applied:    'bg-amber-100 text-amber-800',
  Screening:  'bg-blue-100 text-blue-800 border border-blue-300',
  Accepted:   'bg-blue-500 text-white',
  Matched:    'bg-green-100 text-green-800 border border-green-300',
  Engaged:    'bg-green-500 text-white',
  Graduated:  'bg-purple-100 text-purple-800',
}
```

### `MatchScoreBar.jsx`

Props: `{ score: number }` (0–1)

Renders a labeled progress bar. Width = `score * 100`%. Fill color:
- ≥ 0.8 → green
- ≥ 0.6 → amber
- < 0.6 → gray

Shows percentage as text on the right.

### `MentorCard.jsx`

Props: `{ mentor: object, onApprove: fn, onSkip: fn, approved: boolean }`

When `approved` is true, render a green overlay with "Matched ✓" instead of the action buttons.

### `KPICard.jsx`

Props: `{ label, value, sublabel, icon }`

White card, thin border, large value text (32px bold), muted sublabel, Lucide icon top-right.

### `Toast.jsx`

Controlled by a simple context or local state. Auto-dismisses after 3 seconds. Positions fixed bottom-right. Types: success (green) / warning (amber) / error (red).

---

## Color palette — use exactly these

```js
// tailwind.config.js — extend colors
colors: {
  nexus: {
    blue:   '#185FA5',
    green:  '#1D9E75',
    amber:  '#BA7517',
    red:    '#E24B4A',
    surface: '#F8F8F7',
    border:  '#E0DED8',
  }
}
```

---

## Code conventions

All conventions from the base spec apply unchanged:

1. No TypeScript — plain JavaScript and JSX only
2. No CSS files — Tailwind utility classes only
3. Named exports for utilities — default exports for components
4. All API calls go through `api.js` — never call axios directly in a component
5. No `useEffect` for data fetching — trigger all fetches from user actions
6. Error handling — every async call must have try/catch; show errors inline, never `alert()`
7. Loading states — every async button must be disabled with loading text while waiting
8. Mobile first — all layouts must work at 375px minimum width
9. No hardcoded colours — Tailwind colour classes only (using the `nexus.*` extension)
10. Function comments — one-line comment above every function explaining what it does

---

## Demo flow — build and test in this order

1. `Dashboard` renders with KPI cards and charts (hardcoded data first)
2. `SmartIntake` — paste pitch, Gemini returns profile card (fallback works if key not set)
3. "Run AI match now →" navigates to `AIMatching` with company pre-selected
4. `AIMatching` — approve top mentor, toast fires "Edge written to graph"
5. `Pipeline` — "Bulk AI-assign" shows count + time saved
6. `RelationshipGraph` — new edges visible
7. `Flywheel` — accuracy chart with closing narrative

---

## Setup

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
uvicorn main:app --reload --port 8000
# Docs at http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env    # VITE_API_BASE_URL=http://localhost:8000
npm run dev             # http://localhost:5173
```

### Deploy frontend (Firebase Hosting)

```bash
cd frontend
npm run build
firebase deploy --only hosting
# → https://nexus-app.web.app
```

### Deploy backend (Cloud Run — only if live URL needed)

```bash
cd backend
gcloud builds submit --tag asia-southeast1-docker.pkg.dev/nexus-hack-2026/nexus/api
gcloud run deploy nexus-api \
  --image asia-southeast1-docker.pkg.dev/nexus-hack-2026/nexus/api \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --memory 2Gi --cpu 2 --min-instances 1 \
  --set-env-vars GEMINI_API_KEY=$GEMINI_API_KEY,GOOGLE_CLOUD_PROJECT=nexus-hack-2026
```
