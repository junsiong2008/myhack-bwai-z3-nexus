export const SECTORS = ["Fintech", "Agritech", "Healthtech", "Edtech", "Logistics", "Cleantech", "Proptech", "Cybersecurity"];
export const STAGES = ["Idea", "Pre-seed", "Seed", "Series A"];
export const GEOS = [
  { code: "MY", flag: "🇲🇾" },
  { code: "SG", flag: "🇸🇬" },
  { code: "ID", flag: "🇮🇩" },
  { code: "TH", flag: "🇹🇭" },
  { code: "VN", flag: "🇻🇳" },
  { code: "PH", flag: "🇵🇭" },
];

export const STATUSES = ["Applied", "Screened", "Mentor Assigned", "Engaged", "Graduated"];


const MENTOR_SEED = [
  ["Ahmad Razif", ["Fintech", "SaaS"], 4.8, 2, 5, true, "MY"],
  ["Priya Nair", ["Healthtech", "B2B"], 4.5, 3, 5, true, "MY"],
  ["James Loh", ["Agritech", "Hardware"], 4.2, 1, 4, false, "SG"],
  ["Sofia Wong", ["Edtech", "Consumer"], 4.7, 2, 5, true, "MY"],
  ["Daniel Tan", ["Logistics", "Operations"], 4.6, 4, 5, true, "SG"],
  ["Mei Ling Ooi", ["Fintech", "Regulatory"], 4.9, 3, 5, true, "MY"],
  ["Rahul Kapoor", ["Cleantech", "Energy"], 4.4, 1, 4, true, "SG"],
  ["Faridah Yusof", ["Proptech", "Real Estate"], 4.3, 2, 5, false, "MY"],
  ["Wei Jian Lim", ["Cybersecurity", "B2B SaaS"], 4.7, 2, 4, true, "MY"],
  ["Anika Pereira", ["Healthtech", "Operations"], 4.6, 3, 5, true, "SG"],
  ["Hafiz Roslan", ["Fintech", "Growth"], 4.5, 1, 5, true, "MY"],
  ["Nora Idris", ["Agritech", "Supply Chain"], 4.8, 2, 4, true, "MY"],
];

export const MENTORS = MENTOR_SEED.map((m, i) => ({
  id: "M_" + String(i + 1).padStart(3, "0"),
  name: m[0],
  domain: m[1],
  nps: m[2],
  capacity_used: m[3],
  capacity_total: m[4],
  reuse_eligible: m[5],
  geography: m[6],
}));


export const SAMPLE_PITCH = `We are Tanah, a Malaysian agritech SaaS startup helping smallholder palm-oil and durian farmers in Pahang and Johor digitise their plot records, soil readings, and harvest yields. Our mobile app works offline and syncs over SMS where 4G is unreliable. We have 47 pilot farms across two cooperatives and want to expand to 500 in 2026. Team is 4 — two ex-FGV agronomists, one full-stack engineer, one ops lead. We're raising a seed round and need help on regulatory frameworks for export-grade traceability, plus introductions to plantation cooperatives in Sabah and Sarawak.`;

const INTAKE_TEMPLATES = [
  {
    keywords: ["agritech", "farm", "palm", "soil", "harvest", "agronomist", "plantation"], result: {
      sector: "Agritech", stage: "Seed", geography: "MY",
      needs: ["Mentorship", "Regulatory", "BD"],
      problem_statement: "Smallholder palm-oil and durian farmers lack digital plot records, soil insight, and traceability needed for export markets.",
      key_strength: "Two ex-FGV agronomists on founding team, working offline-first mobile pilot across 47 farms in two cooperatives.",
      risk_flag: "Customer concentration risk — two cooperatives represent 100% of current pilot volume.",
      match_readiness: 78, priority_tier: "High", confidence: 94,
    }
  },
  {
    keywords: ["fintech", "payment", "reconciliation", "sme", "banking", "remittance"], result: {
      sector: "Fintech", stage: "Seed", geography: "MY",
      needs: ["Mentorship", "Legal", "Funding"],
      problem_statement: "SMEs spend 12+ hours weekly reconciling fragmented payment data across banks, e-wallets, and marketplaces.",
      key_strength: "Working integrations with three Malaysian banks and a paying pilot cohort of 14 SMEs at RM 8k MRR.",
      risk_flag: "Limited market validation — pilot tenure averages 4 months; churn not yet observed at scale.",
      match_readiness: 82, priority_tier: "High", confidence: 91,
    }
  },
  {
    keywords: ["healthtech", "clinic", "medical", "patient", "doctor", "health"], result: {
      sector: "Healthtech", stage: "Pre-seed", geography: "MY",
      needs: ["Mentorship", "Regulatory", "Funding"],
      problem_statement: "Tier-2 clinics in Malaysia lack an affordable interoperability layer to share patient records across panels and insurers.",
      key_strength: "Clinical advisory board of 6 GPs and an MVP deployed at 3 clinics in Klang Valley.",
      risk_flag: "PDPA and MOH regulatory pathway not fully mapped — could extend GTM by 6 months.",
      match_readiness: 65, priority_tier: "Medium", confidence: 88,
    }
  },
  {
    keywords: ["edtech", "tutoring", "student", "school", "learning", "curriculum"], result: {
      sector: "Edtech", stage: "Pre-seed", geography: "MY",
      needs: ["Mentorship", "Marketing", "BD"],
      problem_statement: "After-school tutoring in Malaysia is fragmented across thousands of independent tutors with no quality or curriculum alignment.",
      key_strength: "Founders are ex-teachers; aligned with MOE KSSM curriculum and 600 active student-parents.",
      risk_flag: "Highly competitive market — three well-funded incumbents already operating in Klang Valley.",
      match_readiness: 60, priority_tier: "Medium", confidence: 86,
    }
  },
  {
    keywords: ["logistics", "delivery", "shipping", "warehouse", "fleet", "last-mile"], result: {
      sector: "Logistics", stage: "Seed", geography: "MY",
      needs: ["Tech", "Funding", "BD"],
      problem_statement: "Cross-border last-mile under 500kg in SEA is opaque, expensive, and lacks reliable tracking for SME shippers.",
      key_strength: "Live integration with 4 regional carriers and a 320-shipper paying cohort.",
      risk_flag: "Operations heavy — gross margin currently 12%, must reach 25% to be venture-scale.",
      match_readiness: 73, priority_tier: "High", confidence: 89,
    }
  },
  {
    keywords: ["cleantech", "solar", "energy", "green", "renewable", "carbon"], result: {
      sector: "Cleantech", stage: "Pre-seed", geography: "MY",
      needs: ["Funding", "Regulatory", "Mentorship"],
      problem_statement: "Rooftop solar adoption for Malaysian SMEs stalls on financing structure, not technology cost.",
      key_strength: "Founders ex-TNB and ex-Maybank; pre-approved RM 2M financing facility with one local bank.",
      risk_flag: "NEM 3.0 policy framework still in transition — terms could shift in next 12 months.",
      match_readiness: 70, priority_tier: "Medium", confidence: 87,
    }
  },
];

export function fakeGeminiParse(pitch) {
  const lower = (pitch || "").toLowerCase();
  let best = INTAKE_TEMPLATES[0], bestScore = 0;
  for (const t of INTAKE_TEMPLATES) {
    const score = t.keywords.reduce((s, k) => s + (lower.includes(k) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; best = t; }
  }
  if (bestScore === 0) {
    return {
      sector: "SaaS", stage: "Pre-seed", geography: "MY",
      needs: ["Mentorship", "Funding", "Tech"],
      problem_statement: "Founders describe a workflow inefficiency in their target segment but the wedge is not yet sharply defined.",
      key_strength: "Domain-experienced founding team with an early pilot in market.",
      risk_flag: "Problem statement needs sharper segmentation — current scope is broad.",
      match_readiness: 55, priority_tier: "Standard", confidence: 78,
    };
  }
  return { ...best.result };
}


export const SECTOR_DISTRIBUTION = [
  { name: "Fintech", value: 28, color: "#185FA5" },
  { name: "Agritech", value: 18, color: "#1D9E75" },
  { name: "Healthtech", value: 15, color: "#3CAEC0" },
  { name: "Edtech", value: 12, color: "#BA7517" },
  { name: "Logistics", value: 10, color: "#7A4FB0" },
  { name: "Other", value: 17, color: "#9C9B96" },
];

export const STAGE_DISTRIBUTION = [
  { name: "Idea", value: 42 },
  { name: "Pre-seed", value: 96 },
  { name: "Seed", value: 118 },
  { name: "Series A", value: 44 },
];

export function computeEngagement(company, mentorId) {
  if (!mentorId) return { state: "unassigned", sessions: 0, lastSessionDays: null, atRisk: false };
  const seed = company.id.charCodeAt(2) + company.id.charCodeAt(3);
  if (company.status === "Applied" || company.status === "Screened") {
    return { state: "pending", sessions: 0, lastSessionDays: null, atRisk: false };
  }
  if (company.status === "Graduated") {
    return { state: "graduated", sessions: 8 + (seed % 4), lastSessionDays: 14, atRisk: false };
  }
  const sessions = (seed % 6);
  const lastSessionDays = sessions === 0 ? 21 + (seed % 14) : (seed % 7) + 1;
  const atRisk = sessions === 0 || lastSessionDays > 14;
  return {
    state: atRisk ? "at-risk" : (sessions >= 3 ? "active" : "low"),
    sessions, lastSessionDays, atRisk,
  };
}


export function suggestOutcome(company, mentorId) {
  const eng = computeEngagement(company, mentorId);
  const mentor = MENTORS.find(m => m.id === mentorId);
  if (!mentor) return { outcome: "dropped", mentor_nps: 3, reuse_eligible: false };
  if (eng.atRisk) return { outcome: "dropped", mentor_nps: 3.2, reuse_eligible: false };
  if (eng.state === "graduated" || eng.state === "active") {
    const nps = Math.min(5, mentor.nps + ((company.id.charCodeAt(3) % 3 - 1) * 0.2));
    return { outcome: "graduated", mentor_nps: Number(nps.toFixed(1)), reuse_eligible: nps >= 4.3 };
  }
  return { outcome: "graduated", mentor_nps: 3.8, reuse_eligible: false };
}
