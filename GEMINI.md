# NEXUS: Ecosystem Intelligence Platform

NEXUS is an AI-enabled platform built for Cradle Fund to automate startup intake, mentor matching, and relationship tracking. It was developed for the **Build With AI MyHack 2026**.

## Project Architecture

The project consists of a FastAPI backend and a React frontend.

- **Backend (`/backend`)**: FastAPI application providing REST endpoints for intake, matching, and statistics.
  - **AI Intake**: Uses Gemini 2.0 Flash (`google-genai`) to parse pitch decks (text or PDF) into structured data.
  - **Matching Engine**: XGBoost classifier trained on historical mentor-company interaction data.
  - **Orchestration**: LangGraph (referenced in README, though logic is distributed in services).
  - **Data Layer**: Currently uses JSON mock files in `backend/data/mock/` for rapid prototyping, with a roadmap for Firestore.
- **Frontend (`/frontend`)**: React 19 single-page application built with Vite and Tailwind CSS v4.
  - **Visualization**: D3.js (v7) for force-directed relationship graphs.
  - **Data Handling**: Uses fallback fixture data (`frontend/src/data.js`) if the backend is unavailable.

## Tech Stack

| Component | Technology |
|---|---|
| **Language** | Python 3.11+, JavaScript (ESM) |
| **Backend Framework** | FastAPI, Uvicorn |
| **Frontend Framework** | React 19, Vite |
| **Styling** | Tailwind CSS v4 |
| **AI / ML** | Gemini 2.0 Flash, XGBoost, Scikit-learn, Pandas |
| **Visualization** | D3.js |
| **Hosting** | Google Cloud Run (Backend), Firebase Hosting (Frontend) |

## Development Workflows

### 1. Backend Setup & Run
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
# Ensure .env is configured with GEMINI_API_KEY
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup & Run
```bash
cd frontend
npm install
# Ensure .env.local points VITE_API_BASE_URL to the backend
npm run dev
```

### 3. Data & Model Management
- **Generate Mock Data**: `python scripts/setup_data.py` - Recreates the initial `companies.json`, `mentors.json`, etc.
- **Retrain Model**: `python scripts/retrain_model.py` - Trains a new `nexus_matching_model.pkl` using current data and 2000 synthetic balanced pairs for better accuracy.

## Environment Variables

### Backend (`backend/.env`)
- `GEMINI_API_KEY`: Required for AI intake features.
- `GOOGLE_CLOUD_PROJECT`: For future Firestore/Cloud Run integration.

### Frontend (`frontend/.env.local`)
- `VITE_API_BASE_URL`: URL of the running backend (e.g., `http://localhost:8000`).

## Key Symbols & Files

- `backend/app/main.py`: Entry point for the FastAPI application.
- `backend/app/api/routes/`: Contains endpoint definitions (intake, matching, etc.).
- `backend/app/services/`: Core business logic for AI intake and XGBoost matching.
- `backend/app/core/store.py`: In-memory data store loaded from JSON mocks.
- `frontend/src/App.jsx`: Main React application entry and routing.
- `frontend/src/screens/`: Individual dashboard, intake, and matching screens.
- `docs/NEXUS_Full_Spec.md`: Detailed product and technical specification.

## Coding Conventions

- **Backend**: Standard FastAPI patterns using Pydantic models for request/response validation (`app/models/schemas.py`). Follow PEP 8 guidelines.
- **Frontend**: Functional components with React 19 hooks. Use Tailwind CSS v4 utility classes for styling.
- **AI**: Gemini prompts should be versioned or clearly documented within `intake.py`. Model features for XGBoost are defined in `retrain_model.py` and must be kept in sync with inference logic.

## Testing & Validation

- The backend can be tested via the automatic Swagger docs at `http://localhost:8000/docs`.
- For UI development, the frontend's fallback mode (defined in `frontend/src/api.js`) allows testing without a live backend.
