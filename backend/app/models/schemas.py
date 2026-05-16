from pydantic import BaseModel
from typing import Optional


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
