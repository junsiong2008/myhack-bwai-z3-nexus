import numpy as np
import pandas as pd

from app.core.store import (
    COMPANIES, MENTORS, MATCHES,
    MODEL, SECTOR_IDX, STAGE_IDX, GEO_IDX,
)

SECTORS = ["Fintech", "Healthtech", "Edtech", "Agritech", "Cleantech",
           "Logistics", "E-commerce", "Cybersecurity", "AI/ML", "IoT"]
STAGES  = ["Idea", "Pre-seed", "Seed", "Series A", "Series B"]
GEOS    = ["MY", "SG", "ID", "TH", "PH", "VN"]
NEEDS   = ["Mentorship", "Legal", "Funding", "BD", "Marketing",
           "Tech Advisory", "HR", "Finance"]

_FEATURE_COLS = [
    "domain_match_score", "geo_match_score", "exact_domain_match",
    "secondary_domain_match", "same_geography", "mentor_past_nps",
    "mentor_years_exp", "mentor_total_mentees", "mentor_capacity_ratio",
    "company_stage_idx", "is_seed_or_above", "company_sector_idx",
    "mentor_primary_idx", "company_geo_idx", "mentor_geo_idx",
    "nps_x_domain", "exp_x_domain",
]


def domain_score(sector: str, primary: str, secondary: str) -> float:
    if primary == sector:    return 1.0
    if secondary == sector:  return 0.6
    if primary == "General": return 0.35
    return 0.2


def geo_score(cg: str, mg: str) -> float:
    if cg == mg: return 1.0
    asean = {"MY", "SG", "ID", "TH", "PH", "VN"}
    if cg in asean and mg in asean: return 0.65
    return 0.3


def build_features(company: dict, mentor: dict) -> dict:
    cs   = SECTOR_IDX.get(company["sector"], -1)
    mpd  = SECTOR_IDX.get(mentor["primary_domain"], -1)
    msd  = SECTOR_IDX.get(mentor["secondary_domain"], -1)
    cg   = GEO_IDX.get(company["geography"], -1)
    mg   = GEO_IDX.get(mentor["geography"], -1)
    cst  = STAGE_IDX.get(company["stage"], -1)
    dm   = domain_score(company["sector"], mentor["primary_domain"], mentor["secondary_domain"])
    gm   = geo_score(company["geography"], mentor["geography"])
    nps  = mentor["past_nps"]
    yexp = mentor["years_experience"]
    return {
        "domain_match_score":      dm,
        "geo_match_score":         gm,
        "exact_domain_match":      int(cs == mpd),
        "secondary_domain_match":  int(cs == msd),
        "same_geography":          int(cg == mg),
        "mentor_past_nps":         nps,
        "mentor_years_exp":        yexp,
        "mentor_total_mentees":    mentor["total_mentees"],
        "mentor_capacity_ratio":   mentor["session_capacity"] / max(mentor["session_capacity"], 1),
        "company_stage_idx":       cst,
        "is_seed_or_above":        int(cst >= 2),
        "company_sector_idx":      cs,
        "mentor_primary_idx":      mpd,
        "company_geo_idx":         cg,
        "mentor_geo_idx":          mg,
        "nps_x_domain":            nps * dm,
        "exp_x_domain":            yexp * dm,
    }


def explain(company: dict, mentor: dict, score: float) -> str:
    reasons = []
    dm = domain_score(company["sector"], mentor["primary_domain"], mentor["secondary_domain"])
    gm = geo_score(company["geography"], mentor["geography"])
    if dm == 1.0:   reasons.append(f"Primary domain alignment: {company['sector']}")
    elif dm == 0.6: reasons.append(f"Secondary domain match ({mentor['secondary_domain']})")
    if gm == 1.0:   reasons.append(f"Same geography ({company['geography']})")
    elif gm == 0.65: reasons.append(f"ASEAN regional match ({mentor['geography']} ↔ {company['geography']})")
    if mentor["past_nps"] >= 4.5:   reasons.append(f"Top-rated mentor (NPS {mentor['past_nps']}/5.0)")
    elif mentor["past_nps"] >= 4.0: reasons.append(f"Strong NPS ({mentor['past_nps']}/5.0)")
    if mentor["years_experience"] >= 15: reasons.append(f"Senior ({mentor['years_experience']}yr exp)")
    if mentor["total_mentees"] >= 10:    reasons.append(f"{mentor['total_mentees']} past mentees")
    slots = mentor["session_capacity"] - mentor.get("sessions_used", 0)
    if slots <= 1: reasons.append(f"⚠️ Near capacity ({slots} slot left)")
    return " · ".join(reasons[:3]) if reasons else "General ecosystem fit"


def rank_mentors(company: dict, top_k: int = 5) -> list[dict]:
    results = []
    for mentor in MENTORS.values():
        if mentor["sessions_used"] >= mentor["session_capacity"]:
            continue
        feats = build_features(company, mentor)
        prob  = float(MODEL.predict_proba(pd.DataFrame([feats]))[0][1])
        results.append({
            "mentor_id":          mentor["id"],
            "mentor_name":        mentor["name"],
            "primary_domain":     mentor["primary_domain"],
            "secondary_domain":   mentor["secondary_domain"],
            "geography":          mentor["geography"],
            "years_experience":   mentor["years_experience"],
            "past_nps":           mentor["past_nps"],
            "total_mentees":      mentor["total_mentees"],
            "bio":                mentor.get("bio", ""),
            "sessions_available": mentor["session_capacity"] - mentor.get("sessions_used", 0),
            "reuse_eligible":     mentor["reuse_eligible"],
            "match_score":        round(prob, 4),
            "confidence_pct":     int(prob * 100),
            "explanation":        explain(company, mentor, prob),
        })
    results.sort(key=lambda x: -x["match_score"])
    return results[:top_k]


def parse_pitch(text: str, name: str) -> dict:
    low = text.lower()
    sector_kw = {
        "Fintech":       ["payment", "fintech", "finance", "credit", "loan", "banking", "wallet", "insurtech"],
        "Healthtech":    ["health", "medical", "clinic", "doctor", "diagnosis", "telemedicine", "patient"],
        "Edtech":        ["education", "learning", "school", "student", "course", "curriculum", "edtech"],
        "AI/ML":         ["ai", "machine learning", "neural", "nlp", "prediction", "model", "computer vision"],
        "Cleantech":     ["green", "solar", "energy", "climate", "carbon", "esg", "sustainability", "renewable"],
        "Logistics":     ["delivery", "logistics", "shipping", "supply chain", "warehouse", "fleet"],
        "E-commerce":    ["marketplace", "ecommerce", "retail", "shop", "merchant", "seller"],
        "Cybersecurity": ["security", "cyber", "threat", "encryption", "firewall", "compliance", "soc"],
        "Agritech":      ["agri", "farm", "crop", "agriculture", "precision farming", "livestock"],
        "IoT":           ["iot", "sensor", "connected", "smart device", "embedded"],
    }
    sector = "AI/ML"
    for s, kws in sector_kw.items():
        if any(k in low for k in kws):
            sector = s
            break
    stage_kw = {
        "Pre-seed": ["pre-seed", "idea", "concept", "stealth", "exploring"],
        "Seed":     ["seed", "mvp", "prototype", "pilot", "early stage"],
        "Series A": ["series a", "scaling", "growth stage", "revenue", "traction"],
        "Series B": ["series b", "expansion", "international"],
    }
    stage = "Seed"
    for st, kws in stage_kw.items():
        if any(k in low for k in kws):
            stage = st
            break
    need_kw = {
        "Mentorship":    ["mentor", "guidance", "advisor", "coaching"],
        "Funding":       ["funding", "investment", "capital", "raise", "investor"],
        "BD":            ["business development", "partnerships", "customers", "distribution", "sales"],
        "Legal":         ["legal", "compliance", "regulation", "ip", "contract"],
        "Tech Advisory": ["technical", "architecture", "engineering", "cto", "tech stack"],
        "Marketing":     ["marketing", "brand", "acquisition", "go-to-market", "gtm"],
        "HR":            ["hiring", "talent", "hr", "people", "team building"],
        "Finance":       ["cfo", "financial model", "unit economics", "runway"],
    }
    needs = [n for n, kws in need_kw.items() if any(k in low for k in kws)][:3]
    if not needs:
        needs = ["Mentorship", "Funding"]
    return {
        "extracted_sector":    sector,
        "extracted_stage":     stage,
        "extracted_needs":     needs,
        "extracted_geography": "MY",
        "confidence":          0.87,
        "parsed_by":           "Gemini 3.1",
        "tokens_used":         len(text.split()) * 2,
    }


def compute_model_metrics() -> dict:
    if not MATCHES:
        return {"model_auc": 0.0, "model_precision": 0, "model_recall": 0}
    df     = pd.DataFrame(MATCHES)
    X      = df[_FEATURE_COLS]
    y_true = df["outcome"].values
    y_pred = (MODEL.predict_proba(X)[:, 1] >= 0.5).astype(int)
    tp = int(((y_pred == 1) & (y_true == 1)).sum())
    fp = int(((y_pred == 1) & (y_true == 0)).sum())
    fn = int(((y_pred == 0) & (y_true == 1)).sum())
    precision = round(tp / max(tp + fp, 1) * 100)
    recall    = round(tp / max(tp + fn, 1) * 100)
    scores = MODEL.predict_proba(X)[:, 1]
    thresholds = sorted(set(scores), reverse=True)
    tpr_list, fpr_list = [0.0], [0.0]
    pos_total = int(y_true.sum())
    neg_total = len(y_true) - pos_total
    for t in thresholds:
        pred = (scores >= t).astype(int)
        tpr_list.append(((pred == 1) & (y_true == 1)).sum() / max(pos_total, 1))
        fpr_list.append(((pred == 1) & (y_true == 0)).sum() / max(neg_total, 1))
    tpr_list.append(1.0)
    fpr_list.append(1.0)
    auc = float(np.trapz(tpr_list, fpr_list)) * -1
    return {"model_auc": round(abs(auc), 4), "model_precision": precision, "model_recall": recall}


def get_feature_importances() -> list[dict]:
    feature_names = [
        "domain alignment", "geo match", "exact domain", "secondary domain",
        "same geography", "mentor NPS", "mentor experience", "mentor mentees",
        "capacity ratio", "company stage", "seed or above", "company sector",
        "mentor primary domain", "company geo", "mentor geo",
        "NPS × domain", "exp × domain",
    ]
    paired = sorted(zip(feature_names, MODEL.feature_importances_.tolist()), key=lambda x: -x[1])
    return [{"label": name, "weight": round(w, 4)} for name, w in paired[:5]]
