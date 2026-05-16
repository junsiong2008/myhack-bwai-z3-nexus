import json
import pickle

from app.core.config import MOCK_DIR, MODEL_PATH

with open(MOCK_DIR / "companies.json") as f:
    _COMPANIES_LIST = json.load(f)
with open(MOCK_DIR / "mentors.json") as f:
    _MENTORS_LIST = json.load(f)
with open(MOCK_DIR / "programmes.json") as f:
    _PROGRAMMES_LIST = json.load(f)
with open(MOCK_DIR / "matches.json") as f:
    MATCHES = json.load(f)

COMPANIES  = {c["id"]: c for c in _COMPANIES_LIST}
MENTORS    = {m["id"]: m for m in _MENTORS_LIST}
PROGRAMMES = {p["id"]: p for p in _PROGRAMMES_LIST}

# Mutable pipeline state
COMPANY_STATUS = {c["id"]: c.get("pipeline_stage", "Applied") for c in _COMPANIES_LIST}
COMPANY_MENTOR = {c["id"]: c["assigned_mentor"] for c in _COMPANIES_LIST if c.get("assigned_mentor")}

with open(MODEL_PATH, "rb") as f:
    _MODEL_BUNDLE = pickle.load(f)

MODEL      = _MODEL_BUNDLE["model"]
SECTOR_IDX = _MODEL_BUNDLE["sector_idx"]
STAGE_IDX  = _MODEL_BUNDLE["stage_idx"]
GEO_IDX    = _MODEL_BUNDLE["geo_idx"]
