const BASE_URL = "http://localhost:8000";
export const PROGRAMME_ID = "P2026";

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

export function adaptCompany(c) {
  return {
    id: c.id,
    name: c.name,
    sector: c.sector,
    stage: c.stage,
    geo: c.geography,
    status: c.pipeline_status || "Applied",
    needs: c.needs || [],
    risk_flag: null,
    problem: c.pitch_summary || "",
    strength: "",
    match_readiness: 60,
    priority: "Standard",
    team_size: c.team_size || 3,
    founded: c.founding_year || 2024,
    _assigned_mentor_name: c.assigned_mentor || null,
  };
}

export function adaptMentor(m) {
  return {
    id: m.id,
    name: m.name,
    domain: [m.primary_domain, m.secondary_domain].filter(Boolean),
    nps: m.past_nps,
    capacity_used: m.sessions_used || 0,
    capacity_total: m.session_capacity,
    reuse_eligible: m.reuse_eligible,
    geography: m.geography,
  };
}

export function adaptMatchResult(m) {
  return {
    mentor_id: m.mentor_id,
    name: m.mentor_name,
    score: m.match_score,
    explanation: m.explanation,
    nps: m.past_nps,
    capacity_used: 0,
    capacity_total: Math.max(1, m.sessions_available || 3),
    reuse_eligible: m.reuse_eligible,
    domain_tags: [m.primary_domain, m.secondary_domain].filter(Boolean),
    geography: m.geography,
  };
}

export function adaptIntakeResult(extraction, company) {
  const sector = extraction.sector || extraction.extracted_sector;
  const stage = extraction.stage || extraction.extracted_stage;
  const geography = extraction.geography || extraction.extracted_geography || "MY";
  const needs = extraction.needs || extraction.extracted_needs || [];
  const rawConf = extraction.confidence;
  const confidence = rawConf != null
    ? (rawConf > 1 ? Math.round(rawConf) : Math.round(rawConf * 100))
    : 87;
  return {
    sector,
    stage,
    geography,
    needs,
    problem_statement: extraction.problem_statement || company?.pitch_summary || "",
    key_strength: extraction.key_strength || `Domain-experienced team building in ${sector?.toLowerCase() || "tech"}.`,
    risk_flag: extraction.risk_flag || null,
    match_readiness: extraction.match_readiness != null ? Math.round(extraction.match_readiness * 100) : 65,
    priority_tier: extraction.priority || extraction.priority_tier || "Standard",
    confidence,
  };
}

export async function fetchStats() {
  return apiFetch("/api/stats");
}

export async function fetchCompanies(params = {}) {
  const p = { limit: 100, ...params };
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(p).filter(([, v]) => v != null))).toString();
  const data = await apiFetch(`/api/companies?${qs}`);
  return { ...data, companies: data.companies.map(adaptCompany) };
}

export async function fetchMentors() {
  const data = await apiFetch("/api/mentors?limit=200");
  return { ...data, mentors: data.mentors.map(adaptMentor) };
}

export async function runMatch(companyId, topK = 5) {
  const data = await apiFetch("/api/match", {
    method: "POST",
    body: JSON.stringify({ company_id: companyId, top_k: topK }),
  });
  return { ...data, top_matches: data.top_matches.map(adaptMatchResult) };
}

export async function runIntake(payload) {
  return apiFetch("/api/intake", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function bulkAssign(programmeId) {
  return apiFetch(`/api/programmes/${programmeId}/bulk-assign`, { method: "POST" });
}

export async function assignMentor(companyId, mentorId) {
  return apiFetch("/api/assign", {
    method: "POST",
    body: JSON.stringify({ company_id: companyId, mentor_id: mentorId }),
  });
}

export async function fetchGraph(programmeId, limit = 20) {
  return apiFetch(`/api/graph/${programmeId}?limit=${limit}`);
}
