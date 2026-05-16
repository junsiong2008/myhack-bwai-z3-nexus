import json
import os
import pickle
import random
from collections import Counter

import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

SECTORS = ["Fintech","Healthtech","Edtech","Agritech","Cleantech",
           "Logistics","E-commerce","Cybersecurity","AI/ML","IoT"]
STAGES = ["Idea","Pre-seed","Seed","Series A","Series B"]
GEOS = ["MY","SG","ID","TH","PH","VN"]

COMPANY_COUNT = 300
MENTOR_COUNT = 80
PROGRAMME_YEARS = [2022, 2023, 2024, 2025, 2026]
MATCH_COUNT = 270

SECTOR_IDX = {s: i for i, s in enumerate(SECTORS)}
STAGE_IDX = {s: i for i, s in enumerate(STAGES)}
GEO_IDX = {g: i for i, g in enumerate(GEOS)}

random.seed(42)
np.random.seed(42)

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # backend/
MOCK = os.path.join(BASE, 'data', 'mock')


def weighted_geo():
    choices = ["MY"] * 40 + ["SG"] * 14 + ["ID"] * 12 + ["TH"] * 10 + ["PH"] * 12 + ["VN"] * 12
    return random.choice(choices)


def sample_company_name(sector, idx):
    prefix = sector.split('/')[0].replace('Tech', '')
    return f"{prefix.title()}Spark{idx:03d}"


def sample_mentor_name(idx):
    return f"Mentor-{idx:03d}"


def create_companies():
    companies = []
    for i in range(1, COMPANY_COUNT + 1):
        sector = random.choice(SECTORS)
        stage = random.choices(STAGES, weights=[18, 22, 30, 18, 12], k=1)[0]
        geography = weighted_geo()
        companies.append({
            "id": f"C{i:04d}",
            "name": sample_company_name(sector, i),
            "sector": sector,
            "stage": stage,
            "geography": geography,
            "team_size": random.randint(3, 15),
            "founded_year": random.randint(2019, 2025),
            "needs": random.sample(["Mentorship","Legal","Funding","BD","Marketing","Tech Advisory","HR","Finance"], k=2),
            "programme_year": random.choice(PROGRAMME_YEARS),
            "pipeline_stage": random.choice(["Applied","Screened","Mentor Assigned","Engaged","Graduated"]),
        })
    return companies


def create_mentors():
    mentors = []
    for i in range(1, MENTOR_COUNT + 1):
        primary = random.choice(SECTORS)
        secondary = random.choice([s for s in SECTORS if s != primary])
        geography = weighted_geo()
        years = random.randint(5, 25)
        base_nps = round(np.clip(np.random.normal(4.2, 0.5), 3.0, 5.0), 2)
        capacity = random.randint(5, 20)
        total_mentees = random.randint(5, 40)
        mentors.append({
            "id": f"M{i:03d}",
            "name": sample_mentor_name(i),
            "primary_domain": primary,
            "secondary_domain": secondary,
            "geography": geography,
            "years_experience": years,
            "past_nps": base_nps,
            "total_mentees": total_mentees,
            "session_capacity": capacity,
            "sessions_used": random.randint(0, max(0, capacity - 1)),
            "reuse_eligible": random.random() < 0.75,
            "bio": f"Experienced {primary} mentor with {years} years supporting startups.",
        })
    return mentors


def create_programmes():
    programmes = []
    for year in PROGRAMME_YEARS:
        programmes.append({
            "id": f"P{year}",
            "name": f"CREST {year} Cohort",
            "year": year,
            "status": "active" if year >= 2024 else "completed",
            "cohort_size": 60 if year >= 2024 else 45,
            "focus": random.choice(["Fintech","Healthtech","AI/ML","Cleantech","E-commerce"]),
        })
    return programmes


def make_match(company, mentor):
    company_sector_idx = SECTOR_IDX[company["sector"]]
    mentor_primary_idx = SECTOR_IDX[mentor["primary_domain"]]
    mentor_secondary_idx = SECTOR_IDX[mentor["secondary_domain"]]
    company_geo_idx = GEO_IDX[company["geography"]]
    mentor_geo_idx = GEO_IDX[mentor["geography"]]
    company_stage_idx = STAGE_IDX[company["stage"]]
    is_seed_or_above = int(company_stage_idx >= 2)
    exact_domain_match = int(company_sector_idx == mentor_primary_idx)
    secondary_domain_match = int(company_sector_idx == mentor_secondary_idx)
    same_geography = int(company_geo_idx == mentor_geo_idx)
    domain_match_score = 1.0 if exact_domain_match else 0.6 if secondary_domain_match else 0.2
    geo_match_score = 1.0 if same_geography else 0.65
    nps_x_domain = mentor["past_nps"] * domain_match_score
    exp_x_domain = mentor["years_experience"] * domain_match_score
    confidence = 0.25 * domain_match_score + 0.2 * geo_match_score + 0.15 * (mentor["past_nps"] / 5.0) + 0.15 * (mentor["years_experience"] / 25.0) + 0.1 * is_seed_or_above + 0.15 * (1 - mentor["sessions_used"] / max(mentor["session_capacity"], 1))
    outcome = 1 if confidence + np.random.normal(0, 0.12) > 0.45 else 0
    return {
        "company_id": company["id"],
        "mentor_id": mentor["id"],
        "programme_year": company["programme_year"],
        "domain_match_score": round(domain_match_score + np.random.normal(0, 0.05), 3),
        "geo_match_score": round(geo_match_score + np.random.normal(0, 0.05), 3),
        "exact_domain_match": exact_domain_match,
        "secondary_domain_match": secondary_domain_match,
        "same_geography": same_geography,
        "mentor_past_nps": mentor["past_nps"],
        "mentor_years_exp": mentor["years_experience"],
        "mentor_total_mentees": mentor["total_mentees"],
        "mentor_capacity_ratio": round((mentor["session_capacity"] - mentor["sessions_used"]) / max(mentor["session_capacity"], 1), 3),
        "company_stage_idx": company_stage_idx,
        "is_seed_or_above": is_seed_or_above,
        "company_sector_idx": company_sector_idx,
        "mentor_primary_idx": mentor_primary_idx,
        "company_geo_idx": company_geo_idx,
        "mentor_geo_idx": mentor_geo_idx,
        "nps_x_domain": round(nps_x_domain, 3),
        "exp_x_domain": round(exp_x_domain, 3),
        "outcome": int(outcome),
        "mentor_past_engagements": mentor["total_mentees"],
    }


def assemble_matches(companies, mentors):
    matches = []
    history = []
    for i in range(MATCH_COUNT):
        company = random.choice(companies)
        mentor = random.choice(mentors)
        match = make_match(company, mentor)
        matches.append(match)
    # Ensure roughly 270 historical matches with a balanced outcome
    return matches


def build_feature_matrix(matches):
    return pd.DataFrame(matches)


def train_model(df):
    features = [
        'domain_match_score', 'geo_match_score', 'exact_domain_match', 'secondary_domain_match',
        'same_geography', 'mentor_past_nps', 'mentor_years_exp', 'mentor_total_mentees',
        'mentor_capacity_ratio', 'company_stage_idx', 'is_seed_or_above', 'company_sector_idx',
        'mentor_primary_idx', 'company_geo_idx', 'mentor_geo_idx', 'nps_x_domain', 'exp_x_domain'
    ]
    X = df[features]
    y = df['outcome']
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)
    model = XGBClassifier(use_label_encoder=False, eval_metric='logloss', random_state=42, n_estimators=120, max_depth=4)
    model.fit(X_train, y_train)
    preds = model.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, preds)
    return model, features, auc


def save_dataset(companies, mentors, programmes, matches, model, feature_cols):
    with open(os.path.join(MOCK, 'companies.json'), 'w', encoding='utf-8') as f:
        json.dump(companies, f, indent=2)
    with open(os.path.join(MOCK, 'mentors.json'), 'w', encoding='utf-8') as f:
        json.dump(mentors, f, indent=2)
    with open(os.path.join(MOCK, 'programmes.json'), 'w', encoding='utf-8') as f:
        json.dump(programmes, f, indent=2)
    with open(os.path.join(MOCK, 'matches.json'), 'w', encoding='utf-8') as f:
        json.dump(matches, f, indent=2)
    bundle = {
        'model': model,
        'sector_idx': SECTOR_IDX,
        'stage_idx': STAGE_IDX,
        'geo_idx': GEO_IDX,
        'feature_cols': feature_cols,
    }
    with open(os.path.join(BASE, 'data', 'nexus_matching_model.pkl'), 'wb') as f:
        pickle.dump(bundle, f)


def main():
    companies = create_companies()
    mentors = create_mentors()
    programmes = create_programmes()
    matches = assemble_matches(companies, mentors)
    df = build_feature_matrix(matches)
    model, feature_cols, auc = train_model(df)
    save_dataset(companies, mentors, programmes, matches, model, feature_cols)
    print(f"Generated {len(companies)} companies, {len(mentors)} mentors, {len(programmes)} programmes, {len(matches)} matches")
    print(f"Trained XGBoost model with ROC-AUC: {auc:.4f}")


if __name__ == '__main__':
    main()
