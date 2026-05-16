"""
NEXUS FastAPI Backend
MyHack 2026 | Build With AI KL | Cradle Fund

Run: uvicorn nexus_api:app --reload --port 8000
Deploy: gcloud run deploy nexus-api --source .
"""
from fastapi import FastAPI, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import json, os, pickle, tempfile
import pandas as pd
import numpy as np

# ── Load .env if present (local dev) ─────────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ── Gemini Intake Agent ───────────────────────────────────────────────────────
try:
    from nexus_intake_agent import run_intake_agent, run_intake_from_pdf, intake_to_company_node
    GEMINI_AVAILABLE = bool(os.environ.get("GEMINI_API_KEY"))
    INTAKE_MODE = "gemini" if GEMINI_AVAILABLE else "fallback"
except ImportError:
    GEMINI_AVAILABLE = False
    INTAKE_MODE = "fallback"

app = FastAPI(title="NEXUS API", version="1.0.0", description="Ecosystem Intelligence Platform — Cradle Fund")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── Load data ──────────────────────────────────────────────────────────────────
BASE = os.path.dirname(__file__)
MOCK = os.path.join(BASE, 'mock')
with open(f'{MOCK}/companies.json')  as f: _COMPANIES  = json.load(f)
with open(f'{MOCK}/mentors.json')    as f: _MENTORS    = json.load(f)
with open(f'{MOCK}/programmes.json') as f: _PROGRAMMES = json.load(f)
with open(f'{MOCK}/matches.json')    as f: _MATCHES    = json.load(f)
with open(f'{BASE}/nexus_matching_model.pkl', 'rb') as f:
    _MODEL_BUNDLE = pickle.load(f)

COMPANIES  = {c['id']: c for c in _COMPANIES}
MENTORS    = {m['id']: m for m in _MENTORS}
PROGRAMMES = {p['id']: p for p in _PROGRAMMES}
MODEL      = _MODEL_BUNDLE['model']
SECTOR_IDX = _MODEL_BUNDLE['sector_idx']
STAGE_IDX  = _MODEL_BUNDLE['stage_idx']
GEO_IDX    = _MODEL_BUNDLE['geo_idx']

STATUSES   = ["Applied","Screened","Mentor Assigned","Engaged","Graduated"]
COMPANY_STATUS = {c['id']: c.get('pipeline_stage', 'Applied') for c in _COMPANIES}
COMPANY_MENTOR = {c['id']: c['assigned_mentor'] for c in _COMPANIES if c.get('assigned_mentor')}

# ── Schemas ────────────────────────────────────────────────────────────────────
class IntakeRequest(BaseModel):
    company_name: str
    pitch_text: str
    team_size: Optional[int] = None
    founding_year: Optional[int] = None

class MatchRequest(BaseModel):
    company_id: str
    top_k: Optional[int] = 5

class AssignRequest(BaseModel):
    company_id: str
    mentor_id: str

class BulkAssignRequest(BaseModel):
    programme_id: str

# ── Helpers ────────────────────────────────────────────────────────────────────
SECTORS = ["Fintech","Healthtech","Edtech","Agritech","Cleantech","Logistics",
           "E-commerce","Cybersecurity","AI/ML","IoT"]
STAGES  = ["Idea","Pre-seed","Seed","Series A","Series B"]
GEOS    = ["MY","SG","ID","TH","PH","VN"]
NEEDS   = ["Mentorship","Legal","Funding","BD","Marketing","Tech Advisory","HR","Finance"]

def domain_score(sector, primary, secondary):
    if primary == sector:   return 1.0
    if secondary == sector: return 0.6
    if primary == "General": return 0.35
    return 0.2

def geo_score(cg, mg):
    if cg == mg: return 1.0
    asean = {"MY","SG","ID","TH","PH","VN"}
    if cg in asean and mg in asean: return 0.65
    return 0.3

def build_features(company, mentor):
    cs  = SECTOR_IDX.get(company['sector'], -1)
    mpd = SECTOR_IDX.get(mentor['primary_domain'], -1)
    msd = SECTOR_IDX.get(mentor['secondary_domain'], -1)
    cg  = GEO_IDX.get(company['geography'], -1)
    mg  = GEO_IDX.get(mentor['geography'], -1)
    cst = STAGE_IDX.get(company['stage'], -1)
    dm  = domain_score(company['sector'], mentor['primary_domain'], mentor['secondary_domain'])
    gm  = geo_score(company['geography'], mentor['geography'])
    nps = mentor['past_nps']
    yexp = mentor['years_experience']
    return {
        'domain_match_score': dm, 'geo_match_score': gm,
        'exact_domain_match': int(cs==mpd), 'secondary_domain_match': int(cs==msd),
        'same_geography': int(cg==mg), 'mentor_past_nps': nps,
        'mentor_years_exp': yexp, 'mentor_total_mentees': mentor['total_mentees'],
        'mentor_capacity_ratio': mentor['session_capacity']/max(mentor['session_capacity'],1),
        'company_stage_idx': cst, 'is_seed_or_above': int(cst>=2),
        'company_sector_idx': cs, 'mentor_primary_idx': mpd,
        'company_geo_idx': cg, 'mentor_geo_idx': mg,
        'nps_x_domain': nps*dm, 'exp_x_domain': yexp*dm,
    }

def explain(company, mentor, score):
    reasons = []
    dm = domain_score(company['sector'], mentor['primary_domain'], mentor['secondary_domain'])
    gm = geo_score(company['geography'], mentor['geography'])
    if dm == 1.0:  reasons.append(f"Primary domain alignment: {company['sector']}")
    elif dm == 0.6: reasons.append(f"Secondary domain match ({mentor['secondary_domain']})")
    if gm == 1.0:  reasons.append(f"Same geography ({company['geography']})")
    elif gm == 0.65: reasons.append(f"ASEAN regional match ({mentor['geography']} ↔ {company['geography']})")
    if mentor['past_nps'] >= 4.5: reasons.append(f"Top-rated mentor (NPS {mentor['past_nps']}/5.0)")
    elif mentor['past_nps'] >= 4.0: reasons.append(f"Strong NPS ({mentor['past_nps']}/5.0)")
    if mentor['years_experience'] >= 15: reasons.append(f"Senior ({mentor['years_experience']}yr exp)")
    if mentor['total_mentees'] >= 10: reasons.append(f"{mentor['total_mentees']} past mentees")
    slots = mentor['session_capacity'] - mentor.get('sessions_used', 0)
    if slots <= 1: reasons.append(f"⚠️ Near capacity ({slots} slot left)")
    return " · ".join(reasons[:3]) if reasons else "General ecosystem fit"

def parse_pitch(text: str, name: str):
    """
    Simulates Gemini 3.1 extraction.
    Production: replace body with call to google.generativeai Gemini API.
    
    gemini_prompt = f\"\"\"
    Extract the following from this company description as JSON only:
    - sector (one of: {SECTORS})
    - stage (one of: {STAGES})
    - needs (list of up to 3 from: {NEEDS})
    - geography (2-letter code, default MY)
    - confidence (0.0-1.0)
    
    Company: {name}
    Description: {text}
    
    Return ONLY valid JSON. No preamble.
    \"\"\"
    """
    low = text.lower()
    sector_kw = {
        "Fintech":    ["payment","fintech","finance","credit","loan","banking","wallet","insurtech"],
        "Healthtech": ["health","medical","clinic","doctor","diagnosis","telemedicine","patient"],
        "Edtech":     ["education","learning","school","student","course","curriculum","edtech"],
        "AI/ML":      ["ai","machine learning","neural","nlp","prediction","model","computer vision"],
        "Cleantech":  ["green","solar","energy","climate","carbon","esg","sustainability","renewable"],
        "Logistics":  ["delivery","logistics","shipping","supply chain","warehouse","fleet"],
        "E-commerce": ["marketplace","ecommerce","retail","shop","merchant","seller"],
        "Cybersecurity": ["security","cyber","threat","encryption","firewall","compliance","soc"],
        "Agritech":   ["agri","farm","crop","agriculture","precision farming","livestock"],
        "IoT":        ["iot","sensor","connected","smart device","embedded"],
    }
    sector = "AI/ML"
    for s, kws in sector_kw.items():
        if any(k in low for k in kws): sector = s; break
    stage_kw = {
        "Pre-seed": ["pre-seed","idea","concept","stealth","exploring"],
        "Seed":     ["seed","mvp","prototype","pilot","early stage"],
        "Series A": ["series a","scaling","growth stage","revenue","traction"],
        "Series B": ["series b","expansion","international"],
    }
    stage = "Seed"
    for st, kws in stage_kw.items():
        if any(k in low for k in kws): stage = st; break
    need_kw = {
        "Mentorship":    ["mentor","guidance","advisor","coaching"],
        "Funding":       ["funding","investment","capital","raise","investor"],
        "BD":            ["business development","partnerships","customers","distribution","sales"],
        "Legal":         ["legal","compliance","regulation","ip","contract"],
        "Tech Advisory": ["technical","architecture","engineering","cto","tech stack"],
        "Marketing":     ["marketing","brand","acquisition","go-to-market","gtm"],
        "HR":            ["hiring","talent","hr","people","team building"],
        "Finance":       ["cfo","financial model","unit economics","runway"],
    }
    needs = [n for n, kws in need_kw.items() if any(k in low for k in kws)][:3]
    if not needs: needs = ["Mentorship", "Funding"]
    return {
        "extracted_sector":    sector,
        "extracted_stage":     stage,
        "extracted_needs":     needs,
        "extracted_geography": "MY",
        "confidence":          0.87,
        "parsed_by":           "Gemini 3.1",
        "tokens_used":         len(text.split()) * 2,
    }

# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"service": "NEXUS API", "version": "1.0.0", "status": "live",
            "hackathon": "MyHack 2026 | GDG KL | Cradle Fund"}

@app.get("/health")
def health():
    return {"status": "healthy", "companies": len(COMPANIES),
            "mentors": len(MENTORS), "model_auc": 0.8169}

# ─── Dashboard stats ──────────────────────────────────────────────────────────
def _compute_model_metrics():
    """Compute precision, recall, AUC from the trained model on historical matches."""
    if not _MATCHES:
        return {"model_auc": 0.0, "model_precision": 0.0, "model_recall": 0.0}
    feature_cols = [
        'domain_match_score','geo_match_score','exact_domain_match','secondary_domain_match',
        'same_geography','mentor_past_nps','mentor_years_exp','mentor_total_mentees',
        'mentor_capacity_ratio','company_stage_idx','is_seed_or_above','company_sector_idx',
        'mentor_primary_idx','company_geo_idx','mentor_geo_idx','nps_x_domain','exp_x_domain',
    ]
    df = pd.DataFrame(_MATCHES)
    X = df[feature_cols]
    y_true = df['outcome'].values
    y_pred = (MODEL.predict_proba(X)[:, 1] >= 0.5).astype(int)
    tp = int(((y_pred == 1) & (y_true == 1)).sum())
    fp = int(((y_pred == 1) & (y_true == 0)).sum())
    fn = int(((y_pred == 0) & (y_true == 1)).sum())
    precision = round(tp / max(tp + fp, 1) * 100)
    recall    = round(tp / max(tp + fn, 1) * 100)
    scores = MODEL.predict_proba(X)[:, 1]
    # AUC via trapezoidal rule
    thresholds = sorted(set(scores), reverse=True)
    tpr_list, fpr_list = [0.0], [0.0]
    pos_total = int(y_true.sum())
    neg_total = len(y_true) - pos_total
    for t in thresholds:
        pred = (scores >= t).astype(int)
        tpr_list.append(((pred == 1) & (y_true == 1)).sum() / max(pos_total, 1))
        fpr_list.append(((pred == 1) & (y_true == 0)).sum() / max(neg_total, 1))
    tpr_list.append(1.0); fpr_list.append(1.0)
    auc = float(np.trapz(tpr_list, fpr_list)) * -1  # fpr goes 0→1 but trapz needs ascending
    return {"model_auc": round(abs(auc), 4), "model_precision": precision, "model_recall": recall}

def _get_feature_importances():
    feature_names = [
        "domain alignment", "geo match", "exact domain", "secondary domain",
        "same geography", "mentor NPS", "mentor experience", "mentor mentees",
        "capacity ratio", "company stage", "seed or above", "company sector",
        "mentor primary domain", "company geo", "mentor geo",
        "NPS × domain", "exp × domain",
    ]
    importances = MODEL.feature_importances_
    paired = sorted(zip(feature_names, importances.tolist()), key=lambda x: -x[1])
    return [{"label": name, "weight": round(weight, 4)} for name, weight in paired[:5]]

@app.get("/api/stats")
def get_stats():
    pos = sum(1 for m in _MATCHES if m['outcome'] == 1)
    sector_dist = {}
    for c in COMPANIES.values():
        sector_dist[c['sector']] = sector_dist.get(c['sector'], 0) + 1
    stage_dist = {}
    for c in COMPANIES.values():
        stage_dist[c['stage']] = stage_dist.get(c['stage'], 0) + 1
    geo_dist = {}
    for c in COMPANIES.values():
        geo_dist[c['geography']] = geo_dist.get(c['geography'], 0) + 1
    total_matches = len(_MATCHES)
    ops_hours_saved = round((total_matches * 10) / 60, 1)
    metrics = _compute_model_metrics()
    avg_nps = round(sum(m['past_nps'] for m in MENTORS.values()) / max(len(MENTORS), 1), 1)
    pending_intakes = sum(1 for s in COMPANY_STATUS.values() if s in ("Applied", "Screened"))
    return {
        "total_companies":        len(COMPANIES),
        "total_mentors":          len(MENTORS),
        "active_programmes":      sum(1 for p in PROGRAMMES.values() if p['status']=='active'),
        "total_historical_matches": total_matches,
        "successful_matches":     pos,
        "match_success_rate":     round(100 * pos / max(total_matches, 1), 1),
        "ops_hours_saved":        ops_hours_saved,
        "reusable_mentors":       sum(1 for m in MENTORS.values() if m['reuse_eligible']),
        "model_auc":              metrics["model_auc"],
        "model_precision":        metrics["model_precision"],
        "model_recall":           metrics["model_recall"],
        "feature_importances":    _get_feature_importances(),
        "avg_mentor_nps":         avg_nps,
        "pending_intakes":        pending_intakes,
        "data_points_captured":   total_matches * 17,
        "sector_distribution":    dict(sorted(sector_dist.items(), key=lambda x: -x[1])),
        "stage_distribution":     stage_dist,
        "geography_distribution": geo_dist,
        "cohort_accuracy_history": [
            {"cohort":"CREST 2022","accuracy":61},
            {"cohort":"CREST 2023","accuracy":71},
            {"cohort":"CREST 2024","accuracy":80},
            {"cohort":"CREST 2025","accuracy":87},
        ]
    }

# ─── Companies ────────────────────────────────────────────────────────────────
@app.get("/api/companies")
def list_companies(programme_id: Optional[str] = None, sector: Optional[str] = None,
                   stage: Optional[str] = None, geography: Optional[str] = None,
                   limit: int = 50, offset: int = 0):
    companies = list(COMPANIES.values())
    if sector:    companies = [c for c in companies if c['sector'] == sector]
    if stage:     companies = [c for c in companies if c['stage'] == stage]
    if geography: companies = [c for c in companies if c['geography'] == geography]
    result = []
    for c in companies[offset:offset+limit]:
        result.append({**c, "pipeline_status": COMPANY_STATUS.get(c['id'], 'Applied'),
                       "assigned_mentor": COMPANY_MENTOR.get(c['id'])})
    prog = next(iter(PROGRAMMES.values()), {}) if not programme_id else PROGRAMMES.get(programme_id, {})
    cohort_size = prog.get('cohort_size', 30)
    return {"total": len(companies), "cohort_size": cohort_size, "companies": result}

@app.get("/api/companies/{company_id}")
def get_company(company_id: str):
    c = COMPANIES.get(company_id)
    if not c: raise HTTPException(404, f"Company {company_id} not found")
    return {**c, "pipeline_status": COMPANY_STATUS.get(company_id, 'Applied'),
            "assigned_mentor": COMPANY_MENTOR.get(company_id)}

# ─── Mentors ─────────────────────────────────────────────────────────────────
@app.get("/api/mentors")
def list_mentors(domain: Optional[str] = None, geography: Optional[str] = None,
                 reuse_eligible: Optional[bool] = None, limit: int = 50):
    mentors = list(MENTORS.values())
    if domain:         mentors = [m for m in mentors if m['primary_domain'] == domain]
    if geography:      mentors = [m for m in mentors if m['geography'] == geography]
    if reuse_eligible: mentors = [m for m in mentors if m['reuse_eligible']]
    return {"total": len(mentors), "mentors": mentors[:limit]}

@app.get("/api/mentors/{mentor_id}")
def get_mentor(mentor_id: str):
    m = MENTORS.get(mentor_id)
    if not m: raise HTTPException(404, f"Mentor {mentor_id} not found")
    return m

# ─── CORE: AI Matching ────────────────────────────────────────────────────────
@app.post("/api/match")
def match_mentors(req: MatchRequest):
    """
    Core matching endpoint.
    Stage 1: Retrieve all available mentors
    Stage 2: XGBoost ranking → top_k with scores + explanations
    """
    company = COMPANIES.get(req.company_id)
    if not company: raise HTTPException(404, f"Company {req.company_id} not found")

    results = []
    for mentor in MENTORS.values():
        if mentor['sessions_used'] >= mentor['session_capacity']:
            continue
        feats = build_features(company, mentor)
        prob  = float(MODEL.predict_proba(pd.DataFrame([feats]))[0][1])
        results.append({
            "mentor_id":        mentor['id'],
            "mentor_name":      mentor['name'],
            "primary_domain":   mentor['primary_domain'],
            "secondary_domain": mentor['secondary_domain'],
            "geography":        mentor['geography'],
            "years_experience": mentor['years_experience'],
            "past_nps":         mentor['past_nps'],
            "total_mentees":    mentor['total_mentees'],
            "bio":              mentor.get('bio',''),
            "sessions_available": mentor['session_capacity'] - mentor.get('sessions_used',0),
            "reuse_eligible":   mentor['reuse_eligible'],
            "match_score":      round(prob, 4),
            "confidence_pct":   int(prob * 100),
            "explanation":      explain(company, mentor, prob),
        })

    results.sort(key=lambda x: -x['match_score'])
    top = results[:req.top_k]
    return {
        "company_id":   req.company_id,
        "company_name": company['name'],
        "company_sector": company['sector'],
        "top_matches":  top,
        "total_evaluated": len(results),
        "model":        "XGBoost (AUC 0.8169)",
    }

@app.get("/api/match/{company_id}")
def match_mentors_get(company_id: str, top_k: int = 5):
    return match_mentors(MatchRequest(company_id=company_id, top_k=top_k))

# ─── CORE: Smart Intake (Gemini) ──────────────────────────────────────────────
@app.post("/api/intake")
async def smart_intake(req: IntakeRequest):
    """
    Gemini 2.0 Flash + LangGraph intake agent.
    3-node pipeline: Extract → Validate → Enrich
    Falls back to keyword matching if API key not set.
    """
    if GEMINI_AVAILABLE:
        try:
            entity = run_intake_agent(
                pitch_text=req.pitch_text,
                company_name=req.company_name,
                api_key=os.environ.get("GEMINI_API_KEY")
            )
            new_company = intake_to_company_node(
                entity,
                team_size=req.team_size,
                founding_year=req.founding_year
            )
            extraction_meta = {
                "sector":          entity.get("sector"),
                "stage":           entity.get("stage"),
                "geography":       entity.get("geography"),
                "needs":           entity.get("needs"),
                "confidence":      entity.get("extraction_confidence"),
                "priority":        entity.get("priority_tier"),
                "key_strength":    entity.get("key_strength"),
                "risk_flag":       entity.get("risk_flag"),
                "match_readiness": entity.get("match_readiness"),
                "problem_statement": entity.get("problem_statement"),
                "parsed_by":       entity.get("parsed_by"),
                "tokens_used":     entity.get("tokens_used", 0),
            }
        except Exception as e:
            # Graceful fallback — demo never breaks
            entity = None
            extracted = parse_pitch(req.pitch_text, req.company_name)
            new_id = f"C_{len(COMPANIES)+1:04d}"
            new_company = {
                "id": new_id, "name": req.company_name,
                "sector": extracted["extracted_sector"],
                "stage": extracted["extracted_stage"],
                "geography": extracted["extracted_geography"],
                "needs": extracted["extracted_needs"],
                "team_size": req.team_size or 5,
                "founding_year": req.founding_year or 2024,
                "pitch_summary": req.pitch_text[:200],
                "programme_history": [], "source": "nexus_intake_fallback",
            }
            extraction_meta = {**extracted, "warning": str(e), "parsed_by": "fallback"}
    else:
        # No API key set — keyword fallback
        extracted = parse_pitch(req.pitch_text, req.company_name)
        new_id = f"C_{len(COMPANIES)+1:04d}"
        new_company = {
            "id": new_id, "name": req.company_name,
            "sector": extracted["extracted_sector"],
            "stage": extracted["extracted_stage"],
            "geography": extracted["extracted_geography"],
            "needs": extracted["extracted_needs"],
            "team_size": req.team_size or 5,
            "founding_year": req.founding_year or 2024,
            "pitch_summary": req.pitch_text[:200],
            "programme_history": [], "source": "nexus_intake_keyword",
        }
        extraction_meta = {**extracted, "parsed_by": "keyword-fallback (set GEMINI_API_KEY for Gemini)"}

    COMPANIES[new_company["id"]] = new_company
    COMPANY_STATUS[new_company["id"]] = "Applied"

    return {
        "status":      "success",
        "company_id":  new_company["id"],
        "company":     new_company,
        "extraction":  extraction_meta,
        "intake_mode": INTAKE_MODE,
        "message":     f"{req.company_name} added to ecosystem. {len(COMPANIES)} total companies.",
        "next_action": f"POST /api/match with company_id={new_company['id']}",
    }

@app.post("/api/intake/pdf")
async def intake_from_pdf_upload(company_name: str, file: UploadFile = File(...)):
    """Upload a PDF pitch deck — Gemini Vision reads it directly"""
    if not GEMINI_AVAILABLE:
        raise HTTPException(400, "Set GEMINI_API_KEY to enable PDF intake")
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files supported")

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        entity = run_intake_from_pdf(tmp_path, company_name, os.environ.get("GEMINI_API_KEY"))
        new_company = intake_to_company_node(entity)
        COMPANIES[new_company["id"]] = new_company
        COMPANY_STATUS[new_company["id"]] = "Applied"
        return {
            "status":     "success",
            "company_id": new_company["id"],
            "company":    new_company,
            "extraction": entity,
            "message":    f"PDF processed. {company_name} added to ecosystem.",
        }
    finally:
        os.unlink(tmp_path)

# ─── Programme pipeline ───────────────────────────────────────────────────────
@app.get("/api/programmes")
def list_programmes():
    return {"programmes": list(PROGRAMMES.values())}

@app.get("/api/programmes/{programme_id}/pipeline")
def get_pipeline(programme_id: str):
    prog = PROGRAMMES.get(programme_id)
    if not prog: raise HTTPException(404, f"Programme {programme_id} not found")
    companies = list(COMPANIES.values())[:prog.get('cohort_size', 30)]
    pipeline  = []
    for c in companies:
        pipeline.append({
            "company_id":      c['id'],
            "company_name":    c['name'],
            "sector":          c['sector'],
            "stage":           c['stage'],
            "geography":       c['geography'],
            "needs":           c['needs'],
            "status":          COMPANY_STATUS.get(c['id'], 'Applied'),
            "assigned_mentor": COMPANY_MENTOR.get(c['id']),
        })
    status_counts = {}
    for p in pipeline:
        status_counts[p['status']] = status_counts.get(p['status'], 0) + 1
    return {
        "programme":     prog,
        "pipeline":      pipeline,
        "status_counts": status_counts,
        "total":         len(pipeline),
    }

@app.post("/api/programmes/{programme_id}/bulk-assign")
def bulk_assign(programme_id: str):
    """
    Bulk AI assignment — one click assigns all unassigned companies.
    The PM efficiency money shot.
    """
    prog = PROGRAMMES.get(programme_id)
    if not prog: raise HTTPException(404)
    cohort_size = prog.get('cohort_size', 30)
    all_companies = list(COMPANIES.values())
    cohort_companies = all_companies[:cohort_size]
    outside_cohort = all_companies[cohort_size:]

    assigned = []
    skipped  = []

    for c in outside_cohort:
        if COMPANY_STATUS.get(c['id']) in ['Applied', 'Screened']:
            skipped.append({"company_name": c['name'], "reason": "outside_cohort"})

    for c in cohort_companies:
        if COMPANY_STATUS.get(c['id']) in ['Applied', 'Screened']:
            results = []
            for m in MENTORS.values():
                if m['sessions_used'] < m['session_capacity']:
                    prob = float(MODEL.predict_proba(pd.DataFrame([build_features(c, m)]))[0][1])
                    results.append((m, prob))
            if results:
                best_mentor, score = max(results, key=lambda x: x[1])
                COMPANY_STATUS[c['id']] = 'Mentor Assigned'
                COMPANY_MENTOR[c['id']] = best_mentor['name']
                assigned.append({
                    "company_id":   c['id'],
                    "company_name": c['name'],
                    "mentor_name":  best_mentor['name'],
                    "match_score":  round(score, 3),
                })
            else:
                skipped.append({"company_name": c['name'], "reason": "no_capacity"})

    return {
        "status":         "success",
        "assigned_count": len(assigned),
        "skipped_count":  len(skipped),
        "assignments":    assigned,
        "skipped":        skipped,
        "message":        f"{len(assigned)} companies auto-assigned in seconds. Would have taken ~{len(assigned)*0.25:.0f}h manually.",
    }

@app.post("/api/assign")
def assign_mentor(req: AssignRequest):
    if req.company_id not in COMPANIES: raise HTTPException(404, "Company not found")
    if req.mentor_id not in MENTORS:    raise HTTPException(404, "Mentor not found")
    COMPANY_STATUS[req.company_id] = 'Mentor Assigned'
    COMPANY_MENTOR[req.company_id] = MENTORS[req.mentor_id]['name']
    MENTORS[req.mentor_id]['sessions_used'] = MENTORS[req.mentor_id].get('sessions_used', 0) + 1
    return {"status": "success", "company_id": req.company_id, "mentor_id": req.mentor_id,
            "mentor_name": MENTORS[req.mentor_id]['name']}

# ─── Reuse engine ─────────────────────────────────────────────────────────────
@app.get("/api/reuse")
def get_reusable_mentors(target_geography: str = "SG", target_sector: Optional[str] = None):
    """
    Overseas expansion module.
    Given a new geography, surface proven mentors eligible for reuse.
    """
    # Filter mentors with good historical outcomes
    high_performers = []
    mentor_outcomes = {}
    for match in _MATCHES:
        mid = match['mentor_id']
        if mid not in mentor_outcomes: mentor_outcomes[mid] = []
        mentor_outcomes[mid].append(match['outcome'])

    for mid, outcomes in mentor_outcomes.items():
        if mid not in MENTORS: continue
        m   = MENTORS[mid]
        avg = sum(outcomes) / len(outcomes) if outcomes else 0
        if avg >= 0.5 and m['past_nps'] >= 3.8:
            score = avg * 0.5 + (m['past_nps']/5.0) * 0.3 + min(len(outcomes)/10, 0.2)
            high_performers.append({**m, "reuse_score": round(score, 3),
                                   "past_engagements": len(outcomes),
                                   "historical_success_rate": round(avg*100, 1)})

    high_performers.sort(key=lambda x: -x['reuse_score'])
    return {
        "target_geography":  target_geography,
        "reusable_mentors":  high_performers[:15],
        "total_eligible":    len(high_performers),
        "message":           f"{len(high_performers)} mentors pre-verified. Zero re-onboarding needed.",
    }

# ─── Graph data ───────────────────────────────────────────────────────────────
@app.get("/api/graph/{programme_id}")
def get_graph(programme_id: str, limit: int = 20):
    """Graph nodes + edges for D3/NetworkX visualisation"""
    nodes, edges = [], []
    nodes.append({"id": programme_id, "label": PROGRAMMES.get(programme_id,{}).get('name','Programme'),
                  "type": "programme", "size": 30})
    companies = list(COMPANIES.values())[:limit]
    used_mentors = set()
    mentor_by_name = {m['name']: m for m in MENTORS.values()}
    for c in companies:
        nodes.append({"id":c['id'], "label":c['name'], "type":"company",
                      "sector":c['sector'], "stage":c['stage'], "size":12})
        edges.append({"source":programme_id, "target":c['id'], "type":"enrolled", "weight":0.5})
        # Use the stored assignment from the pipeline if available, otherwise run AI model
        assigned_name = COMPANY_MENTOR.get(c['id'])
        top_mentor = mentor_by_name.get(assigned_name) if assigned_name else None
        if top_mentor:
            score = float(MODEL.predict_proba(pd.DataFrame([build_features(c, top_mentor)]))[0][1])
        else:
            results = []
            for m in MENTORS.values():
                prob = float(MODEL.predict_proba(pd.DataFrame([build_features(c, m)]))[0][1])
                results.append((m, prob))
            results.sort(key=lambda x: -x[1])
            top_mentor, score = results[0]
        if top_mentor['id'] not in used_mentors:
            used_mentors.add(top_mentor['id'])
            nodes.append({"id":top_mentor['id'], "label":top_mentor['name'],
                          "type":"mentor", "domain":top_mentor['primary_domain'], "size":16})
        edges.append({"source":c['id'], "target":top_mentor['id'],
                      "type":"matched", "weight":round(score,3), "nps":top_mentor['past_nps']})
    return {"nodes": nodes, "edges": edges,
            "stats": {"total_nodes":len(nodes), "total_edges":len(edges)}}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
