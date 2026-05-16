import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

BASE_DIR   = Path(__file__).resolve().parent.parent.parent  # backend/
DATA_DIR   = BASE_DIR / "data"
MOCK_DIR   = DATA_DIR / "mock"
MODEL_PATH = DATA_DIR / "nexus_matching_model.pkl"

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_AVAILABLE = bool(GEMINI_API_KEY)
INTAKE_MODE = "gemini" if GEMINI_AVAILABLE else "fallback"
