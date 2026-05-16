# Deployment Guide

## Architecture

- **Backend**: Google Cloud Run (FastAPI)
- **Frontend**: Firebase Hosting (React Native Web)

---

## Backend — Google Cloud Run

### Prerequisites

- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
- Docker (optional — Cloud Build handles the build remotely)

### 1. Authenticate & configure

```bash
gcloud auth login
gcloud config set project genai-study-jam-2025-capstone
gcloud config set run/region asia-southeast1
```

Enable required APIs:

```bash
gcloud services enable run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com
```

### 2. Create Artifact Registry repository (first time only)

```bash
gcloud artifacts repositories create nexus-backend \
  --repository-format=docker \
  --location=asia-southeast1
```

### 3. Build & push the Docker image

Run from the `backend/` directory:

```bash
cd backend

gcloud builds submit \
  --tag asia-southeast1-docker.pkg.dev/genai-study-jam-2025-capstone/nexus-backend/api:latest
```

### 4. Deploy to Cloud Run

```bash
gcloud run deploy nexus-backend \
  --image asia-southeast1-docker.pkg.dev/genai-study-jam-2025-capstone/nexus-backend/api:latest \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --min-instances 1 \
  --set-env-vars "GEMINI_API_KEY=<your-api-key>"
```

> `--min-instances 1` keeps one instance warm to avoid cold starts during demos.

### 5. Verify

```bash
curl https://<your-cloud-run-url>/docs
```

FastAPI's `/docs` page should load.

---

## Notes

- `backend/.dockerignore` and `backend/.gcloudignore` exclude `.venv`, `__pycache__`, `.env`, and `scripts/` from the build context to keep uploads small.
- The `data/` directory is included in the image because `app/core/store.py` loads JSON files from it at startup.
- Never commit your `.env` file or hardcode API keys. Pass secrets via `--set-env-vars` or Google Secret Manager.
