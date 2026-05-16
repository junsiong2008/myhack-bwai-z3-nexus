from typing import Optional

from fastapi import APIRouter, HTTPException

from app.core.store import COMPANIES, PROGRAMMES, COMPANY_STATUS, COMPANY_MENTOR

router = APIRouter()


@router.get("/api/companies")
def list_companies(
    sector: Optional[str] = None,
    stage: Optional[str] = None,
    geography: Optional[str] = None,
    programme_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    companies = list(COMPANIES.values())
    if sector:    companies = [c for c in companies if c["sector"] == sector]
    if stage:     companies = [c for c in companies if c["stage"] == stage]
    if geography: companies = [c for c in companies if c["geography"] == geography]

    result = [
        {**c, "pipeline_status": COMPANY_STATUS.get(c["id"], "Applied"),
         "assigned_mentor": COMPANY_MENTOR.get(c["id"])}
        for c in companies[offset : offset + limit]
    ]
    prog = (
        PROGRAMMES.get(programme_id, {})
        if programme_id
        else next(iter(PROGRAMMES.values()), {})
    )
    return {"total": len(companies), "cohort_size": prog.get("cohort_size", 30), "companies": result}


@router.get("/api/companies/{company_id}")
def get_company(company_id: str):
    c = COMPANIES.get(company_id)
    if not c:
        raise HTTPException(404, f"Company {company_id} not found")
    return {
        **c,
        "pipeline_status": COMPANY_STATUS.get(company_id, "Applied"),
        "assigned_mentor":  COMPANY_MENTOR.get(company_id),
    }
