from typing import Optional

from fastapi import APIRouter, HTTPException

from app.core.store import MENTORS, MATCHES

router = APIRouter()


@router.get("/api/mentors")
def list_mentors(
    domain: Optional[str] = None,
    geography: Optional[str] = None,
    reuse_eligible: Optional[bool] = None,
    limit: int = 50,
):
    mentors = list(MENTORS.values())
    if domain:         mentors = [m for m in mentors if m["primary_domain"] == domain]
    if geography:      mentors = [m for m in mentors if m["geography"] == geography]
    if reuse_eligible: mentors = [m for m in mentors if m["reuse_eligible"]]
    return {"total": len(mentors), "mentors": mentors[:limit]}


@router.get("/api/mentors/{mentor_id}")
def get_mentor(mentor_id: str):
    m = MENTORS.get(mentor_id)
    if not m:
        raise HTTPException(404, f"Mentor {mentor_id} not found")
    return m


@router.get("/api/reuse")
def get_reusable_mentors(target_geography: str = "SG", target_sector: Optional[str] = None):
    mentor_outcomes: dict[str, list] = {}
    for match in MATCHES:
        mid = match["mentor_id"]
        mentor_outcomes.setdefault(mid, []).append(match["outcome"])

    high_performers = []
    for mid, outcomes in mentor_outcomes.items():
        if mid not in MENTORS:
            continue
        m   = MENTORS[mid]
        avg = sum(outcomes) / len(outcomes) if outcomes else 0
        if avg >= 0.5 and m["past_nps"] >= 3.8:
            score = avg * 0.5 + (m["past_nps"] / 5.0) * 0.3 + min(len(outcomes) / 10, 0.2)
            high_performers.append({
                **m,
                "reuse_score":            round(score, 3),
                "past_engagements":       len(outcomes),
                "historical_success_rate": round(avg * 100, 1),
            })

    high_performers.sort(key=lambda x: -x["reuse_score"])
    return {
        "target_geography": target_geography,
        "reusable_mentors": high_performers[:15],
        "total_eligible":   len(high_performers),
        "message": f"{len(high_performers)} mentors pre-verified. Zero re-onboarding needed.",
    }
