"""
Retrain the XGBoost matching model with:
  - 2000 balanced training pairs (was 270 — massively underfit)
  - 3-level geo_score matching nexus_api.py (was only 2-level in original)
  - Regularised XGBoost so scores spread 0.3-0.95 instead of saturating at 0.999
Run: python retrain_model.py
"""
import json, pickle, os, random
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score
from xgboost import XGBClassifier

rng = random.Random(2026)
np.random.seed(2026)

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # backend/
MOCK = os.path.join(BASE, 'data', 'mock')

with open(f'{MOCK}/companies.json') as f:
    companies = json.load(f)
with open(f'{MOCK}/mentors.json') as f:
    mentors = json.load(f)

SECTORS = ["Fintech","Healthtech","Edtech","Agritech","Cleantech",
           "Logistics","E-commerce","Cybersecurity","AI/ML","IoT"]
STAGES  = ["Idea","Pre-seed","Seed","Series A","Series B"]
GEOS    = ["MY","SG","ID","TH","PH","VN"]
ASEAN   = set(GEOS)

SECTOR_IDX = {s: i for i, s in enumerate(SECTORS)}
STAGE_IDX  = {s: i for i, s in enumerate(STAGES)}
GEO_IDX    = {g: i for i, g in enumerate(GEOS)}

FEATURES = [
    'domain_match_score', 'geo_match_score', 'exact_domain_match',
    'secondary_domain_match', 'same_geography', 'mentor_past_nps',
    'mentor_years_exp', 'mentor_total_mentees', 'mentor_capacity_ratio',
    'company_stage_idx', 'is_seed_or_above', 'company_sector_idx',
    'mentor_primary_idx', 'company_geo_idx', 'mentor_geo_idx',
    'nps_x_domain', 'exp_x_domain',
]

def domain_score(sector, primary, secondary):
    if primary == sector:    return 1.0
    if secondary == sector:  return 0.6
    if primary == "General": return 0.35
    return 0.2

def geo_score(cg, mg):
    if cg == mg: return 1.0
    if cg in ASEAN and mg in ASEAN: return 0.65
    return 0.3

def make_row(company, mentor, rng_noise=True):
    cs  = SECTOR_IDX.get(company['sector'], 0)
    mpd = SECTOR_IDX.get(mentor['primary_domain'], 0)
    msd = SECTOR_IDX.get(mentor['secondary_domain'], 0)
    cg  = GEO_IDX.get(company['geography'], 0)
    mg  = GEO_IDX.get(mentor['geography'], 0)
    cst = STAGE_IDX.get(company['stage'], 0)
    dm  = domain_score(company['sector'], mentor['primary_domain'], mentor['secondary_domain'])
    gm  = geo_score(company['geography'], mentor['geography'])
    nps  = mentor['past_nps']
    yexp = mentor['years_experience']

    # Outcome function — calibrated so ~40% positives
    # Requires strong domain match + decent geo + good NPS to be positive
    raw = (0.40 * dm +
           0.25 * gm +
           0.20 * (nps / 5.0) +
           0.15 * (min(yexp, 25) / 25.0))
    noise = np.random.normal(0, 0.09) if rng_noise else 0.0
    outcome = 1 if (raw + noise) > 0.65 else 0

    return {
        'domain_match_score':     round(dm, 3),
        'geo_match_score':        round(gm, 3),
        'exact_domain_match':     int(cs == mpd),
        'secondary_domain_match': int(cs == msd),
        'same_geography':         int(cg == mg),
        'mentor_past_nps':        nps,
        'mentor_years_exp':       yexp,
        'mentor_total_mentees':   mentor['total_mentees'],
        'mentor_capacity_ratio':  round(mentor['session_capacity'] / max(mentor['session_capacity'], 1), 3),
        'company_stage_idx':      cst,
        'is_seed_or_above':       int(cst >= 2),
        'company_sector_idx':     cs,
        'mentor_primary_idx':     mpd,
        'company_geo_idx':        cg,
        'mentor_geo_idx':         mg,
        'nps_x_domain':           round(nps * dm, 3),
        'exp_x_domain':           round(yexp * dm, 3),
        'outcome':                outcome,
    }

# ── Generate 2000 training pairs ───────────────────────────────────────────────
rows = [make_row(rng.choice(companies), rng.choice(mentors)) for _ in range(2000)]
df = pd.DataFrame(rows)

bal = df['outcome'].value_counts().to_dict()
print(f"Training pairs: {len(df)}  |  positives: {bal.get(1,0)}  negatives: {bal.get(0,0)}")

X = df[FEATURES]
y = df['outcome']
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42, stratify=y)

# ── Regularised XGBoost ────────────────────────────────────────────────────────
model = XGBClassifier(
    n_estimators=100,
    max_depth=3,          # shallow trees → less overfit
    learning_rate=0.08,
    subsample=0.75,
    colsample_bytree=0.75,
    reg_alpha=1.0,        # L1
    reg_lambda=3.0,       # L2
    min_child_weight=5,   # prevents tiny leaf splits
    use_label_encoder=False,
    eval_metric='logloss',
    random_state=42,
)
model.fit(X_train, y_train,
          eval_set=[(X_test, y_test)],
          verbose=False)

preds = model.predict_proba(X_test)[:, 1]
auc   = roc_auc_score(y_test, preds)
print(f"Test AUC: {auc:.4f}")
print(f"Score range on test set: {preds.min():.3f} -- {preds.max():.3f}")
print(f"Buckets: <0.4={sum(preds<0.4)}  0.4-0.7={sum((preds>=0.4)&(preds<0.7))}  >0.7={sum(preds>=0.7)}")

# ── Save new bundle ────────────────────────────────────────────────────────────
bundle = {
    'model':      model,
    'sector_idx': SECTOR_IDX,
    'stage_idx':  STAGE_IDX,
    'geo_idx':    GEO_IDX,
    'feature_cols': FEATURES,
}
with open(os.path.join(BASE, 'data', 'nexus_matching_model.pkl'), 'wb') as f:
    pickle.dump(bundle, f)
print("Saved nexus_matching_model.pkl")

# ── Sanity check: rank all mentors for one Fintech company ────────────────────
test_company = next(c for c in companies if c['sector'] == 'Fintech')
print(f"\nSample ranking — company: {test_company['name']} (Fintech, {test_company['geography']})")
print(f"{'Mentor':<28} {'Primary':14} {'Geo':4} {'dm':5} {'gm':5} {'Score'}")
print("-" * 70)

scores = []
for m in mentors:
    row = make_row(test_company, m, rng_noise=False)
    score = float(model.predict_proba(pd.DataFrame([row])[FEATURES])[0][1])
    dm = row['domain_match_score']
    gm = row['geo_match_score']
    scores.append((m['name'], m['primary_domain'], m['geography'], dm, gm, score))

scores.sort(key=lambda x: -x[5])
for name, domain, geo, dm, gm, score in scores[:8]:
    print(f"{name:<28} {domain:<14} {geo:<4} {dm:<5} {gm:<5} {score:.4f}")
print("  ...")
for name, domain, geo, dm, gm, score in scores[-3:]:
    print(f"{name:<28} {domain:<14} {geo:<4} {dm:<5} {gm:<5} {score:.4f}")
