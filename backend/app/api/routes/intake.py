import os
import tempfile

from fastapi import APIRouter, HTTPException, UploadFile, File

from app.core.config import GEMINI_API_KEY, GEMINI_AVAILABLE, INTAKE_MODE
from app.core.store import COMPANIES, COMPANY_STATUS
from app.models.schemas import IntakeRequest
from app.services.matching import parse_pitch

router = APIRouter()

try:
    from app.services.intake import run_intake_agent, run_intake_from_pdf, intake_to_company_node
    _INTAKE_IMPORTED = True
except ImportError:
    _INTAKE_IMPORTED = False


@router.post("/api/intake")
async def smart_intake(req: IntakeRequest):
    if GEMINI_AVAILABLE and _INTAKE_IMPORTED:
        try:
            entity = run_intake_agent(
                pitch_text=req.pitch_text,
                company_name=req.company_name,
                api_key=GEMINI_API_KEY,
            )
            new_company = intake_to_company_node(
                entity, team_size=req.team_size, founding_year=req.founding_year
            )
            extraction_meta = {
                "sector":            entity.get("sector"),
                "stage":             entity.get("stage"),
                "geography":         entity.get("geography"),
                "needs":             entity.get("needs"),
                "confidence":        entity.get("extraction_confidence"),
                "priority":          entity.get("priority_tier"),
                "key_strength":      entity.get("key_strength"),
                "risk_flag":         entity.get("risk_flag"),
                "match_readiness":   entity.get("match_readiness"),
                "problem_statement": entity.get("problem_statement"),
                "parsed_by":         entity.get("parsed_by"),
                "tokens_used":       entity.get("tokens_used", 0),
            }
        except Exception as e:
            extraction_meta, new_company = _keyword_fallback(req, warning=str(e))
    else:
        extraction_meta, new_company = _keyword_fallback(req)

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


@router.post("/api/intake/pdf")
async def intake_from_pdf_upload(company_name: str, file: UploadFile = File(...)):
    if not GEMINI_AVAILABLE:
        raise HTTPException(400, "Set GEMINI_API_KEY to enable PDF intake")
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files supported")

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        entity      = run_intake_from_pdf(tmp_path, company_name, GEMINI_API_KEY)
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


def _keyword_fallback(req: IntakeRequest, warning: str = None) -> tuple[dict, dict]:
    extracted = parse_pitch(req.pitch_text, req.company_name)
    new_id    = f"C_{len(COMPANIES) + 1:04d}"
    new_company = {
        "id":                new_id,
        "name":              req.company_name,
        "sector":            extracted["extracted_sector"],
        "stage":             extracted["extracted_stage"],
        "geography":         extracted["extracted_geography"],
        "needs":             extracted["extracted_needs"],
        "team_size":         req.team_size or 5,
        "founding_year":     req.founding_year or 2024,
        "pitch_summary":     req.pitch_text[:200],
        "programme_history": [],
        "source":            "nexus_intake_keyword",
    }
    meta = {
        **extracted,
        "parsed_by": "keyword-fallback (set GEMINI_API_KEY for Gemini)",
    }
    if warning:
        meta["warning"] = warning
    return meta, new_company
