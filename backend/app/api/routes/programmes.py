import pandas as pd
from fastapi import APIRouter, HTTPException

from app.core.store import (
    COMPANIES, MENTORS, PROGRAMMES,
    COMPANY_STATUS, COMPANY_MENTOR, MODEL,
)
from app.services.matching import build_features

router = APIRouter()


@router.get("/api/programmes")
def list_programmes():
    return {"programmes": list(PROGRAMMES.values())}


@router.get("/api/programmes/{programme_id}/pipeline")
def get_pipeline(programme_id: str):
    prog = PROGRAMMES.get(programme_id)
    if not prog:
        raise HTTPException(404, f"Programme {programme_id} not found")

    companies = list(COMPANIES.values())[: prog.get("cohort_size", 30)]
    pipeline  = [
        {
            "company_id":      c["id"],
            "company_name":    c["name"],
            "sector":          c["sector"],
            "stage":           c["stage"],
            "geography":       c["geography"],
            "needs":           c["needs"],
            "status":          COMPANY_STATUS.get(c["id"], "Applied"),
            "assigned_mentor": COMPANY_MENTOR.get(c["id"]),
        }
        for c in companies
    ]
    status_counts: dict[str, int] = {}
    for p in pipeline:
        status_counts[p["status"]] = status_counts.get(p["status"], 0) + 1

    return {
        "programme":     prog,
        "pipeline":      pipeline,
        "status_counts": status_counts,
        "total":         len(pipeline),
    }


@router.post("/api/programmes/{programme_id}/bulk-assign")
def bulk_assign(programme_id: str):
    prog = PROGRAMMES.get(programme_id)
    if not prog:
        raise HTTPException(404)

    cohort_size      = prog.get("cohort_size", 30)
    all_companies    = list(COMPANIES.values())
    cohort_companies = all_companies[:cohort_size]
    outside_cohort   = all_companies[cohort_size:]

    assigned: list[dict] = []
    skipped:  list[dict] = []

    for c in outside_cohort:
        if COMPANY_STATUS.get(c["id"]) in ("Applied", "Screened"):
            skipped.append({"company_name": c["name"], "reason": "outside_cohort"})

    for c in cohort_companies:
        if COMPANY_STATUS.get(c["id"]) not in ("Applied", "Screened"):
            continue
        results = [
            (m, float(MODEL.predict_proba(pd.DataFrame([build_features(c, m)]))[0][1]))
            for m in MENTORS.values()
            if m["sessions_used"] < m["session_capacity"]
        ]
        if results:
            best_mentor, score = max(results, key=lambda x: x[1])
            COMPANY_STATUS[c["id"]] = "Mentor Assigned"
            COMPANY_MENTOR[c["id"]] = best_mentor["name"]
            assigned.append({
                "company_id":   c["id"],
                "company_name": c["name"],
                "mentor_name":  best_mentor["name"],
                "match_score":  round(score, 3),
            })
        else:
            skipped.append({"company_name": c["name"], "reason": "no_capacity"})

    return {
        "status":         "success",
        "assigned_count": len(assigned),
        "skipped_count":  len(skipped),
        "assignments":    assigned,
        "skipped":        skipped,
        "message": f"{len(assigned)} companies auto-assigned in seconds. "
                   f"Would have taken ~{len(assigned) * 0.25:.0f}h manually.",
    }


@router.get("/api/graph/{programme_id}")
def get_graph(programme_id: str, limit: int = 20):
    nodes: list[dict] = []
    edges: list[dict] = []

    prog_name = PROGRAMMES.get(programme_id, {}).get("name", "Programme")
    nodes.append({"id": programme_id, "label": prog_name, "type": "programme", "size": 30})

    companies      = list(COMPANIES.values())[:limit]
    used_mentors:  set[str] = set()
    mentor_by_name = {m["name"]: m for m in MENTORS.values()}

    for c in companies:
        nodes.append({
            "id": c["id"], "label": c["name"], "type": "company",
            "sector": c["sector"], "stage": c["stage"], "size": 12,
        })
        edges.append({"source": programme_id, "target": c["id"], "type": "enrolled", "weight": 0.5})

        assigned_name = COMPANY_MENTOR.get(c["id"])
        top_mentor    = mentor_by_name.get(assigned_name) if assigned_name else None

        if top_mentor:
            score = float(MODEL.predict_proba(pd.DataFrame([build_features(c, top_mentor)]))[0][1])
        else:
            results = [
                (m, float(MODEL.predict_proba(pd.DataFrame([build_features(c, m)]))[0][1]))
                for m in MENTORS.values()
            ]
            results.sort(key=lambda x: -x[1])
            top_mentor, score = results[0]

        if top_mentor["id"] not in used_mentors:
            used_mentors.add(top_mentor["id"])
            nodes.append({
                "id": top_mentor["id"], "label": top_mentor["name"],
                "type": "mentor", "domain": top_mentor["primary_domain"], "size": 16,
            })
        edges.append({
            "source": c["id"], "target": top_mentor["id"],
            "type": "matched", "weight": round(score, 3), "nps": top_mentor["past_nps"],
        })

    return {
        "nodes": nodes,
        "edges": edges,
        "stats": {"total_nodes": len(nodes), "total_edges": len(edges)},
    }
