"""
NEXUS FastAPI Backend
MyHack 2026 | Build With AI KL | Cradle Fund

Run:    uvicorn app.main:app --reload --port 8000
Deploy: gcloud run deploy nexus-api --source .
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.store import COMPANIES, MENTORS
from app.api.routes import companies, intake, matches, mentors, programmes, stats

app = FastAPI(
    title="NEXUS API",
    version="1.0.0",
    description="Ecosystem Intelligence Platform — Cradle Fund",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stats.router)
app.include_router(companies.router)
app.include_router(mentors.router)
app.include_router(matches.router)
app.include_router(intake.router)
app.include_router(programmes.router)


@app.get("/")
def root():
    return {
        "service":    "NEXUS API",
        "version":    "1.0.0",
        "status":     "live",
        "hackathon":  "MyHack 2026 | GDG KL | Cradle Fund",
    }


@app.get("/health")
def health():
    return {
        "status":    "healthy",
        "companies": len(COMPANIES),
        "mentors":   len(MENTORS),
        "model_auc": 0.8169,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
