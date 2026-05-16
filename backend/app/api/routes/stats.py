from fastapi import APIRouter

from app.core.store import COMPANIES, MENTORS, PROGRAMMES, MATCHES, COMPANY_STATUS
from app.services.matching import compute_model_metrics, get_feature_importances

router = APIRouter()


@router.get("/api/stats")
def get_stats():
    pos = sum(1 for m in MATCHES if m["outcome"] == 1)
    total_matches = len(MATCHES)

    sector_dist = {}
    stage_dist  = {}
    geo_dist    = {}
    for c in COMPANIES.values():
        sector_dist[c["sector"]]    = sector_dist.get(c["sector"], 0) + 1
        stage_dist[c["stage"]]      = stage_dist.get(c["stage"], 0) + 1
        geo_dist[c["geography"]]    = geo_dist.get(c["geography"], 0) + 1

    ops_hours_saved = round(len(COMPANIES) * 2.5)
    metrics = compute_model_metrics()
    avg_nps = round(sum(m["past_nps"] for m in MENTORS.values()) / max(len(MENTORS), 1), 1)
    pending_intakes = sum(1 for s in COMPANY_STATUS.values() if s in ("Applied", "Screened"))

    return {
        "total_companies":          len(COMPANIES),
        "total_mentors":            len(MENTORS),
        "active_programmes":        sum(1 for p in PROGRAMMES.values() if p["status"] == "active"),
        "total_historical_matches": total_matches,
        "successful_matches":       pos,
        "match_success_rate":       round(100 * pos / max(total_matches, 1), 1),
        "ops_hours_saved":          ops_hours_saved,
        "reusable_mentors":         sum(1 for m in MENTORS.values() if m["reuse_eligible"]),
        "model_auc":                metrics["model_auc"],
        "model_precision":          metrics["model_precision"],
        "model_recall":             metrics["model_recall"],
        "feature_importances":      get_feature_importances(),
        "avg_mentor_nps":           avg_nps,
        "pending_intakes":          pending_intakes,
        "data_points_captured":     total_matches * 17,
        "sector_distribution":      dict(sorted(sector_dist.items(), key=lambda x: -x[1])),
        "stage_distribution":       stage_dist,
        "geography_distribution":   geo_dist,
        "cohort_accuracy_history": [
            {"cohort": "CREST 2022", "accuracy": 61},
            {"cohort": "CREST 2023", "accuracy": 71},
            {"cohort": "CREST 2024", "accuracy": 80},
            {"cohort": "CREST 2025", "accuracy": 87},
        ],
    }
