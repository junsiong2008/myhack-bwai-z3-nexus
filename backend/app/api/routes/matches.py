import pandas as pd
from fastapi import APIRouter, HTTPException

from app.core.store import COMPANIES, MENTORS, COMPANY_STATUS, COMPANY_MENTOR, MODEL
from app.models.schemas import MatchRequest, AssignRequest
from app.services.matching import build_features, rank_mentors

router = APIRouter()


@router.post("/api/match")
def match_mentors(req: MatchRequest):
    company = COMPANIES.get(req.company_id)
    if not company:
        raise HTTPException(404, f"Company {req.company_id} not found")

    top = rank_mentors(company, req.top_k)
    return {
        "company_id":      req.company_id,
        "company_name":    company["name"],
        "company_sector":  company["sector"],
        "top_matches":     top,
        "total_evaluated": len([m for m in MENTORS.values()
                                if m["sessions_used"] < m["session_capacity"]]),
        "model":           "XGBoost (AUC 0.8169)",
    }


@router.get("/api/match/{company_id}")
def match_mentors_get(company_id: str, top_k: int = 5):
    return match_mentors(MatchRequest(company_id=company_id, top_k=top_k))


@router.post("/api/assign")
def assign_mentor(req: AssignRequest):
    if req.company_id not in COMPANIES:
        raise HTTPException(404, "Company not found")
    if req.mentor_id not in MENTORS:
        raise HTTPException(404, "Mentor not found")
    COMPANY_STATUS[req.company_id] = "Mentor Assigned"
    COMPANY_MENTOR[req.company_id] = MENTORS[req.mentor_id]["name"]
    MENTORS[req.mentor_id]["sessions_used"] = MENTORS[req.mentor_id].get("sessions_used", 0) + 1
    return {
        "status":      "success",
        "company_id":  req.company_id,
        "mentor_id":   req.mentor_id,
        "mentor_name": MENTORS[req.mentor_id]["name"],
    }
