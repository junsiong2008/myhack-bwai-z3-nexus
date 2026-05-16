"""
NEXUS Intake Agent
Gemini 2.0 Flash + LangGraph orchestration
MyHack 2026 | GDG KL | Cradle Fund

Pipeline:
  raw pitch text / PDF
       ↓
  [Node 1] Gemini 2.0 Flash — extract structured entity
       ↓
  [Node 2] Validator — check completeness, fill gaps
       ↓
  [Node 3] Enricher — add ecosystem tags, match readiness score
       ↓
  structured CompanyEntity → graph node

Usage:
  from nexus_intake_agent import run_intake_agent
  result = run_intake_agent(pitch_text="...", company_name="PayHive")
"""

import os, json, re
from typing import TypedDict, Optional, List

try:
    from google import genai
    from google.genai import types
except Exception:
    genai = None
    types = None

try:
    from langgraph.graph import StateGraph, END
except Exception:
    StateGraph = None
    END = None

# ── Config ─────────────────────────────────────────────────────────────────────
# Get from: https://aistudio.google.com/app/apikey
# Set env:  export GEMINI_API_KEY="your_key_here"
# Or pass directly to run_intake_agent(api_key="...")

GEMINI_MODEL  = "gemini-2.0-flash"   # Fast + cheap — ideal for hackathon
FALLBACK_MODEL = "gemini-1.5-flash"  # Fallback if 2.0 unavailable on your key

SECTORS = ["Fintech","Healthtech","Edtech","Agritech","Cleantech",
           "Logistics","E-commerce","Cybersecurity","AI/ML","IoT","General"]
STAGES  = ["Idea","Pre-seed","Seed","Series A","Series B"]
GEOS    = ["MY","SG","ID","TH","PH","VN","Other"]
NEEDS   = ["Mentorship","Legal","Funding","BD","Marketing",
           "Tech Advisory","HR","Finance","Regulatory","IP"]

# ── LangGraph State ────────────────────────────────────────────────────────────
class IntakeState(TypedDict):
    # Inputs
    company_name:   str
    pitch_text:     str
    api_key:        str

    # Node 1 output
    raw_extraction: Optional[dict]
    extraction_error: Optional[str]

    # Node 2 output
    validated_entity: Optional[dict]

    # Node 3 output
    final_entity: Optional[dict]

    # Meta
    nodes_run: List[str]
    total_tokens: int

# ── Node 1: Gemini Extractor ───────────────────────────────────────────────────
EXTRACTION_PROMPT = """You are an expert analyst for Cradle Fund, Malaysia's national startup funding agency.

Extract a structured company profile from the pitch description below.

Return ONLY valid JSON — no markdown, no preamble, no explanation. Just the JSON object.

Required fields:
{{
  "sector": "<one of: {sectors}>",
  "stage": "<one of: {stages}>",
  "geography": "<one of: {geos}>",
  "needs": ["<up to 3 from: {needs}>"],
  "problem_statement": "<1 sentence — what problem does the company solve>",
  "target_market": "<who are their customers>",
  "key_strength": "<the single most compelling thing about this company>",
  "risk_flag": "<biggest concern or gap visible from the pitch, or null>",
  "match_readiness": <0.0-1.0, how ready are they to be matched with a mentor>,
  "confidence": <0.0-1.0, your confidence in the extraction>
}}

Rules:
- If a field cannot be determined from the text, use the most reasonable default
- geography defaults to "MY" if not mentioned (Cradle Fund is Malaysian)
- needs must have at least 1 item
- Be direct and specific — no hedging language in the values

Company name: {company_name}

Pitch description:
{pitch_text}"""

def node_extract(state: IntakeState) -> IntakeState:
    """Node 1: Gemini 2.0 Flash extracts structured entity from raw pitch"""
    state["nodes_run"] = state.get("nodes_run", []) + ["extractor"]

    try:
        client = genai.Client(api_key=state["api_key"])

        prompt = EXTRACTION_PROMPT.format(
            sectors=", ".join(SECTORS),
            stages=", ".join(STAGES),
            geos=", ".join(GEOS),
            needs=", ".join(NEEDS),
            company_name=state["company_name"],
            pitch_text=state["pitch_text"][:3000]  # token budget
        )

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.1,        # low temp = consistent structured output
                max_output_tokens=512,
                response_mime_type="application/json",  # force JSON mode
            )
        )

        raw_json = response.text.strip()
        # Strip markdown fences if model adds them despite JSON mode
        raw_json = re.sub(r'^```json\s*', '', raw_json)
        raw_json = re.sub(r'\s*```$', '', raw_json)

        extracted = json.loads(raw_json)
        state["raw_extraction"] = extracted
        state["total_tokens"] = state.get("total_tokens", 0) + (
            response.usage_metadata.total_token_count
            if hasattr(response, 'usage_metadata') and response.usage_metadata
            else len(prompt.split()) * 2
        )

    except json.JSONDecodeError as e:
        state["extraction_error"] = f"JSON parse failed: {e} | Raw: {response.text[:200]}"
        state["raw_extraction"] = _fallback_extraction(state["pitch_text"])

    except Exception as e:
        state["extraction_error"] = f"Gemini call failed: {e}"
        state["raw_extraction"] = _fallback_extraction(state["pitch_text"])

    return state


def _fallback_extraction(text: str) -> dict:
    """Keyword fallback if Gemini API fails — never leaves user stranded"""
    low = text.lower()
    sector_kw = {
        "Fintech":    ["payment","fintech","finance","credit","banking","wallet"],
        "Healthtech": ["health","medical","clinic","doctor","diagnosis"],
        "Edtech":     ["education","learning","school","edtech","student"],
        "AI/ML":      ["ai","machine learning","neural","prediction","nlp"],
        "Cleantech":  ["green","solar","energy","climate","carbon"],
        "Logistics":  ["delivery","logistics","shipping","supply chain"],
        "E-commerce": ["marketplace","ecommerce","retail","merchant"],
        "Cybersecurity": ["security","cyber","threat","encryption"],
    }
    sector = "AI/ML"
    for s, kws in sector_kw.items():
        if any(k in low for k in kws): sector = s; break
    stage = "Seed" if "seed" in low else "Pre-seed" if "idea" in low else "Seed"
    needs = []
    if any(k in low for k in ["mentor","guidance"]): needs.append("Mentorship")
    if any(k in low for k in ["fund","invest","capital"]): needs.append("Funding")
    if not needs: needs = ["Mentorship", "Funding"]
    return {
        "sector": sector, "stage": stage, "geography": "MY",
        "needs": needs[:3], "problem_statement": "Extracted via fallback",
        "target_market": "TBD", "key_strength": "TBD",
        "risk_flag": None, "match_readiness": 0.6, "confidence": 0.5
    }


# ── Node 2: Validator ─────────────────────────────────────────────────────────
def node_validate(state: IntakeState) -> IntakeState:
    """Node 2: Validates extraction, enforces schema, fills gaps"""
    state["nodes_run"] = state.get("nodes_run", []) + ["validator"]
    raw = state.get("raw_extraction", {})

    def safe_get(field, default, allowed=None):
        val = raw.get(field, default)
        if allowed and val not in allowed:
            return default
        return val

    validated = {
        "sector":            safe_get("sector",   "AI/ML",    SECTORS),
        "stage":             safe_get("stage",    "Seed",     STAGES),
        "geography":         safe_get("geography","MY",       GEOS),
        "needs":             [n for n in raw.get("needs", ["Mentorship"]) if n in NEEDS][:3],
        "problem_statement": str(raw.get("problem_statement", ""))[:300],
        "target_market":     str(raw.get("target_market", ""))[:200],
        "key_strength":      str(raw.get("key_strength", ""))[:200],
        "risk_flag":         raw.get("risk_flag"),
        "match_readiness":   min(1.0, max(0.0, float(raw.get("match_readiness", 0.7)))),
        "confidence":        min(1.0, max(0.0, float(raw.get("confidence", 0.8)))),
    }

    # Guarantee at least one need
    if not validated["needs"]:
        validated["needs"] = ["Mentorship", "Funding"]

    state["validated_entity"] = validated
    return state


# ── Node 3: Enricher ──────────────────────────────────────────────────────────
STAGE_URGENCY = {"Idea": 0.3, "Pre-seed": 0.5, "Seed": 0.8, "Series A": 0.9, "Series B": 0.7}
SECTOR_HOT    = {"Fintech": 0.9, "Healthtech": 0.85, "AI/ML": 0.95,
                 "Cleantech": 0.8, "Edtech": 0.7, "Cybersecurity": 0.85}

def node_enrich(state: IntakeState) -> IntakeState:
    """Node 3: Adds ecosystem intelligence — prioritisation, tags, matching context"""
    state["nodes_run"] = state.get("nodes_run", []) + ["enricher"]
    v = state["validated_entity"]

    # Programme fit score for Cradle's typical focus areas
    sector_score = SECTOR_HOT.get(v["sector"], 0.6)
    stage_score  = STAGE_URGENCY.get(v["stage"], 0.6)
    needs_score  = min(1.0, len(v["needs"]) / 3 * 0.8 + 0.2)

    programme_fit = round(
        sector_score * 0.4 + stage_score * 0.35 + needs_score * 0.25, 3
    )

    # Recommended programme type
    if v["stage"] in ["Idea", "Pre-seed"]:
        recommended_programme = "CREST Pre-seed Track"
    elif v["stage"] == "Seed":
        recommended_programme = "CREST Seed Accelerator"
    else:
        recommended_programme = "CREST Growth Track"

    # Mentor domain priorities (what kind of mentor they need most)
    need_to_domain = {
        "Mentorship": v["sector"], "Tech Advisory": "AI/ML",
        "Legal": "Legal/Compliance", "Funding": "Fintech",
        "BD": v["sector"], "Marketing": "E-commerce",
        "HR": "General", "Finance": "Fintech",
    }
    mentor_domains_needed = list(dict.fromkeys(
        [need_to_domain.get(n, v["sector"]) for n in v["needs"]]
    ))[:2]

    # ASEAN expansion relevance
    asean_relevant = v["sector"] in ["Fintech","Logistics","E-commerce","AI/ML"]

    final = {
        **v,
        "company_name":             state["company_name"],
        "programme_fit_score":      programme_fit,
        "recommended_programme":    recommended_programme,
        "mentor_domains_needed":    mentor_domains_needed,
        "asean_expansion_fit":      asean_relevant,
        "priority_tier":            "High" if programme_fit >= 0.75 else
                                    "Medium" if programme_fit >= 0.55 else "Standard",
        "parsed_by":                "Gemini 2.0 Flash + LangGraph",
        "extraction_confidence":    v["confidence"],
        "nodes_run":                state["nodes_run"],
        "tokens_used":              state.get("total_tokens", 0),
    }

    state["final_entity"] = final
    return state


# ── Build LangGraph ───────────────────────────────────────────────────────────
def build_intake_graph():
    graph = StateGraph(IntakeState)
    graph.add_node("extractor", node_extract)
    graph.add_node("validator", node_validate)
    graph.add_node("enricher",  node_enrich)

    graph.set_entry_point("extractor")
    graph.add_edge("extractor", "validator")
    graph.add_edge("validator", "enricher")
    graph.add_edge("enricher", END)

    return graph.compile()

INTAKE_GRAPH = None  # lazy init — avoids import-time API calls

def run_intake_agent(
    pitch_text:   str,
    company_name: str = "Unknown Company",
    api_key:      str = None,
) -> dict:
    """
    Main entry point.
    
    Args:
        pitch_text:   Raw pitch description, application text, or parsed PDF content
        company_name: Company name
        api_key:      Gemini API key. Falls back to GEMINI_API_KEY env var.
    
    Returns:
        dict with full extracted + enriched company entity
    
    Example:
        result = run_intake_agent(
            pitch_text="We are a seed-stage fintech building payment infra for SMEs...",
            company_name="PayHive",
            api_key="AIza..."
        )
    """
    global INTAKE_GRAPH
    if INTAKE_GRAPH is None:
        INTAKE_GRAPH = build_intake_graph()

    resolved_key = api_key or os.environ.get("GEMINI_API_KEY", "")
    if not resolved_key:
        raise ValueError(
            "No Gemini API key. Set GEMINI_API_KEY env var or pass api_key= argument.\n"
            "Get your key: https://aistudio.google.com/app/apikey"
        )

    initial_state: IntakeState = {
        "company_name":    company_name,
        "pitch_text":      pitch_text,
        "api_key":         resolved_key,
        "raw_extraction":  None,
        "extraction_error": None,
        "validated_entity": None,
        "final_entity":    None,
        "nodes_run":       [],
        "total_tokens":    0,
    }

    final_state = INTAKE_GRAPH.invoke(initial_state)

    entity = final_state["final_entity"] or {}
    if final_state.get("extraction_error"):
        entity["warning"] = final_state["extraction_error"]

    return entity


# ── PDF Support (Gemini Vision) ───────────────────────────────────────────────
def run_intake_from_pdf(pdf_path: str, company_name: str, api_key: str = None) -> dict:
    """
    Bonus: Pass a PDF pitch deck directly to Gemini Vision.
    Gemini reads the slides and extracts the company profile.
    No text parsing needed — Gemini sees the actual deck.
    """
    resolved_key = api_key or os.environ.get("GEMINI_API_KEY", "")
    client = genai.Client(api_key=resolved_key)

    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()

    prompt = f"""You are an analyst for Cradle Fund Malaysia.
Read this pitch deck and extract a company profile.

Return ONLY valid JSON with these fields:
sector, stage, geography, needs (list), problem_statement, 
target_market, key_strength, risk_flag, match_readiness (0-1), confidence (0-1)

Valid sectors: {SECTORS}
Valid stages: {STAGES}
Company name: {company_name}"""

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=[
            types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"),
            prompt
        ],
        config=types.GenerateContentConfig(
            temperature=0.1,
            max_output_tokens=512,
            response_mime_type="application/json",
        )
    )

    extracted = json.loads(response.text.strip())
    # Pass through validator + enricher
    state: IntakeState = {
        "company_name": company_name, "pitch_text": "[PDF upload]",
        "api_key": resolved_key, "raw_extraction": extracted,
        "extraction_error": None, "validated_entity": None,
        "final_entity": None, "nodes_run": ["pdf_extractor"],
        "total_tokens": 0,
    }
    state = node_validate(state)
    state = node_enrich(state)
    return state["final_entity"]


# ── FastAPI integration helper ────────────────────────────────────────────────
def intake_to_company_node(entity: dict, team_size: int = None, founding_year: int = None) -> dict:
    """Converts intake agent output to a NEXUS company node ready for the graph"""
    import random, string
    node_id = "C_" + "".join(random.choices(string.digits, k=4))
    return {
        "id":               node_id,
        "name":             entity.get("company_name", "Unknown"),
        "sector":           entity.get("sector", "AI/ML"),
        "stage":            entity.get("stage", "Seed"),
        "geography":        entity.get("geography", "MY"),
        "needs":            entity.get("needs", ["Mentorship"]),
        "team_size":        team_size or 5,
        "founding_year":    founding_year or 2024,
        "pitch_summary":    entity.get("problem_statement", ""),
        "key_strength":     entity.get("key_strength", ""),
        "risk_flag":        entity.get("risk_flag"),
        "programme_fit":    entity.get("programme_fit_score", 0.7),
        "priority_tier":    entity.get("priority_tier", "Medium"),
        "recommended_programme": entity.get("recommended_programme", "CREST Seed"),
        "mentor_domains_needed": entity.get("mentor_domains_needed", []),
        "asean_fit":        entity.get("asean_expansion_fit", False),
        "source":           "gemini_intake_v2",
        "programme_history": [],
    }


# ── CLI test ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys

    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        print("⚠️  Set your API key first:")
        print("   export GEMINI_API_KEY='your_key_here'")
        print("   Get it: https://aistudio.google.com/app/apikey")
        sys.exit(1)

    TEST_CASES = [
        {
            "name": "PayHive",
            "pitch": "We are a seed-stage fintech startup building embedded payment infrastructure for Malaysian SMEs. Our API allows any app to accept payments in under 10 minutes with full BNM compliance. We have 50 pilot merchants and RM120k MRR. We need mentorship from a fintech operator and legal advisory for our upcoming Series A fundraise."
        },
        {
            "name": "SihatAI",
            "pitch": "SihatAI is an early-stage healthtech company using computer vision and LLMs to assist rural clinic doctors in Malaysia with diagnostic support. We process patient symptoms, lab results, and images to suggest differential diagnoses. We're pre-revenue but have 3 MOH pilot clinics. We need tech advisory and BD support to expand to government hospitals."
        },
        {
            "name": "GreenWatt",
            "pitch": "We help Malaysian factories reduce energy costs through IoT monitoring and AI-powered optimisation. Our hardware-software solution has been deployed in 8 factories with 23% average energy reduction. Looking for Series A funding and regional expansion support into Indonesia and Thailand."
        },
    ]

    print("\n🤖 NEXUS Intake Agent — Gemini 2.0 Flash + LangGraph")
    print("=" * 60)

    for tc in TEST_CASES:
        print(f"\n📄 Processing: {tc['name']}")
        print(f"   Pitch: {tc['pitch'][:80]}...")

        result = run_intake_agent(
            pitch_text=tc["pitch"],
            company_name=tc["name"],
            api_key=api_key
        )

        print(f"\n   ✅ Extraction complete ({result.get('tokens_used', 0)} tokens)")
        print(f"   Sector:      {result.get('sector')}")
        print(f"   Stage:       {result.get('stage')}")
        print(f"   Geography:   {result.get('geography')}")
        print(f"   Needs:       {result.get('needs')}")
        print(f"   Fit score:   {result.get('programme_fit_score')} → {result.get('priority_tier')} priority")
        print(f"   Programme:   {result.get('recommended_programme')}")
        print(f"   Strength:    {result.get('key_strength', '')[:80]}")
        print(f"   Risk flag:   {result.get('risk_flag')}")
        print(f"   Confidence:  {result.get('extraction_confidence')}")
        print(f"   Nodes run:   {' → '.join(result.get('nodes_run', []))}")

    print("\n🚀 Agent pipeline working. Integrate into nexus_api.py with:")
    print("   from nexus_intake_agent import run_intake_agent, intake_to_company_node")
