# NEXUS — User Journey

> There is one primary user: the **Cradle programme manager (PM)**. The applicant (startup) does not log into NEXUS — they submit their pitch externally and the PM processes it. This is intentional: Cradle doesn't need to change how startups apply, only how the PM handles what comes in.

---

## Who does what

| Icon | Actor | Role |
|---|---|---|
| PM | Programme manager | The human using NEXUS day to day |
| AI | Gemini / XGBoost | Automated processing triggered by PM actions |
| SYS | System | Background writes to Firestore / graph |

---

## Step 1 — PM lands on Dashboard

**Screen:** Dashboard

**What happens:**
- PM | Arrives at NEXUS, Dashboard loads by default
- PM | Reads KPI cards: 300 companies, 80 mentors, 64.2% match rate, ~45h saved this cohort
- PM | Checks model stats strip — ROC-AUC 0.87, Precision 82%, Recall 77%
- PM | Decides which screen to go to next based on where the programme is

**What this replaces:** Nothing — this KPI view didn't exist before. The PM previously had no single view of programme health.

---

## Step 2 — PM processes a new applicant

**Screen:** Smart Intake

**Context:** A startup emails their pitch deck. Previously the PM would read it manually, fill a spreadsheet row by hand, and try to categorise it. Now:

**What happens:**
- PM | Navigates to Smart Intake in the sidebar
- PM | Pastes the startup's pitch text into the textarea
- PM | Optionally fills in company name, team size, founding year
- PM | Clicks "Parse with Gemini"
- AI | Gemini 2.0 Flash extracts: sector, stage, geography, needs, problem statement, key strength, risk flag, match readiness score, priority tier
- PM | Reviews the extracted profile card on the right — pays attention to the risk flag and priority tier
- PM | Clicks "Add to ecosystem" — company becomes a structured node in the graph
- PM | Optionally clicks "Run AI match now →" to jump straight to matching

**What this replaces:** 75+ hours of manual reading per cohort at 300+ applicants. Each application now takes ~15 seconds instead of 10–15 minutes.

**Key output:** A structured company profile with sector, stage, needs, and a risk flag — ready for matching.

---

## Step 3 — PM runs the AI match engine

**Screen:** AI Matching

**Context:** The PM needs to assign a mentor to PayEasy. Previously this meant opening a spreadsheet of 80 mentors, manually cross-referencing domains, emailing 3–4 mentors to check availability, waiting for replies, and guessing based on gut feel.

**What happens:**
- PM | Selects PayEasy from the company dropdown (or arrives here via "Match now →" from Intake)
- PM | Reviews the company card — sector, stage, needs, risk flag confirmed
- PM | Clicks "Run AI match engine"
- AI | XGBoost scores all mentors using: domain overlap, geography match, past NPS, capacity remaining, outcome history, embedding similarity
- AI | Returns top 3 ranked mentors with: match score (0–100%), explanation line, NPS badge, capacity indicator, reuse-eligible badge
- PM | Reviews each mentor card — reads the explanation ("Strong domain match: fintech SaaS. Past NPS 4.8/5.")
- PM | Clicks "Approve" on the top match (Ahmad Razif, 91%)
- SYS | Edge written to graph: PayEasy → Ahmad Razif, with match score, programme ID, timestamp
- SYS | Toast notification: "Edge written to graph · Ahmad Razif matched to PayEasy"

**What this replaces:** Manual spreadsheet trawl + email ping-pong. Each match previously took 1–2 hours of back-and-forth. NEXUS returns a ranked, explained recommendation in under 1 second.

**Key output:** A typed, attributed graph edge between company and mentor — reusable, auditable, and persistent.

---

## Step 4 — PM manages the full cohort

**Screen:** Programme Pipeline

**Context:** 30 companies need mentor assignments before the programme starts. The PM uses bulk-assign to clear the queue in one action.

**What happens:**
- PM | Navigates to Programme Pipeline
- PM | Sees table of 30 companies with status badges: Applied, Matched, Engaged, Graduated
- PM | Filters to "Applied" — sees 10 unassigned companies
- PM | Clicks "Bulk AI-assign"
- AI | Match engine runs for all 10 Applied companies simultaneously
- SYS | 10 edges written to graph simultaneously
- SYS | Toast: "10 companies matched in 2.1s · 7.3 hours saved"
- PM | Spots one company with no good match (skipped count: 1) — clicks "Assign" on that row manually
- PM | Picks from the inline top-3 mentor suggestions
- PM | All companies now showing Matched — pipeline is clear

**What this replaces:** Doing the step-3 flow individually for every company in the cohort. Bulk-assign compresses what was a full afternoon into seconds.

**Key output:** Every company in the cohort has an assigned mentor. The pipeline view gives the PM full visibility at a glance.

---

## Step 5 — PM monitors the programme

**Screen:** Relationship Graph + Pipeline (ongoing, weeks 1–12)

**What happens:**
- PM | Checks Pipeline weekly — filters by status to see who has moved from Matched → Engaged
- PM | Navigates to Relationship Graph to visualise the network
- SYS | Graph shows companies (blue nodes), mentors (green nodes), programme node (amber), edges weighted by match score
- PM | Hovers over an edge — tooltip shows match score, NPS so far, outcome status
- PM | Notices a company with no mentor sessions logged (anomaly alert in dashboard)
- PM | Flags them for intervention — contacts the mentor directly
- PM | Uses graph to spot overloaded mentors (many thick edges) and redistribute if needed

**What this replaces:** Manually chasing up each PM via email, no visibility into who is actually engaging vs. ghosting.

---

## Step 6 — PM closes the programme

**Screen:** Pipeline (end-of-programme action)

**Context:** 12 weeks later. This is the moment NEXUS captures what every previous system threw away.

**What happens:**
- PM | Returns to Pipeline at programme end
- PM | Updates each company's status: Graduated or Dropped
- PM | Submits NPS scores for each mentor-company pair (1–5 scale)
- PM | Clicks "End programme & capture outcomes"
- SYS | All graph edges updated with outcome labels: `outcome: "graduated"` or `"dropped"`, `nps_mentor`, `nps_company`, `reuse_eligible: true/false`
- SYS | Toast: "30 edges updated with outcome labels · Reuse-eligible mentors flagged · Model retraining queued"

**What this replaces:** The data being archived or deleted. Previously the PM closed a spreadsheet and the institutional knowledge was gone. Now every outcome is a labeled training record.

**Key output:** Every mentor-company edge in the graph now carries an outcome label. This is the training signal for the next XGBoost retrain.

---

## Step 7 — Next cohort starts smarter

**Screen:** Flywheel + Smart Intake (next cycle)

**Context:** A new programme launches — CREST 2027 MY. The system already knows what worked.

**What happens:**
- SYS | XGBoost retrained on all historical edges including Cohort 4 outcomes
- SYS | Model accuracy improves: 79% → 87% AUC (because training data volume compounded)
- PM | Launches CREST 2027 MY — new programme node created
- SYS | Reuse-eligible mentors from 2026 auto-surfaced: "14 top-performing mentors available to reactivate"
- PM | Clicks "Activate all reuse-eligible" — 14 mentors onboarded in one click, pre-verified
- PM | Navigates to Flywheel screen — sees the accuracy chart rising across 4 cohorts
- PM | New applicants come in — the improved model now matches them more accurately from day 1

**What this replaces:** Starting from zero. Previously Cohort 5 ran at Cohort 1 intelligence. Now each cohort inherits everything the previous ones learned.

**Key output:** A compounding system that gets measurably better with every programme that runs through it.

---

## Step 8 — Leadership views programme impact

**Screen:** Flywheel (leadership reporting panel)

**Context:** Cradle leadership or a government reviewer wants to know whether the programme is producing better startup outcomes than last year — and needs data to justify the budget.

**What happens:**
- LEAD | Navigates to the Flywheel screen
- LEAD | Reads the leadership reporting panel below the accuracy chart: 24 startups graduated · 87% match accuracy · 100% outcome data captured · MYR 102,880 ops savings per year
- LEAD | Can now answer the Ministry of Finance question: "Are your programmes producing better outcomes than last year?" — with a specific, defensible number
- LEAD | Uses the panel as the basis for government reporting and budget justification

**What this replaces:** Anecdotal reporting. Previously Cradle leadership could not quantify which interventions produced better startup outcomes because no outcome data was being captured or modelled. Every budget justification was qualitative. NEXUS makes it attributable.

**Key output:** A reportable evidence base linking programme interventions to startup outcomes — the first time Cradle can do this with data.

---

## Full journey summary

| Step | Screen | Actor | Action | What it replaces |
|---|---|---|---|---|
| 1 | Dashboard | PM | Reads programme health at a glance | No equivalent existed |
| 2 | Smart Intake | PM | Pastes pitch or uploads PDF → Gemini parses | 75 hrs manual reading per cohort |
| 3 | AI Matching | PM | Selects company → approves top mentor | Spreadsheet trawl + email ping-pong |
| 4 | Pipeline | PM | Bulk AI-assign for full cohort | Full afternoon of manual assignment |
| 5 | Graph + Pipeline | PM | Monitors engagement, flags at-risk companies | Manual weekly check-ins |
| 6 | Pipeline | PM | Closes programme, captures all outcomes + NPS | Data archived or deleted |
| 7 | Flywheel | PM | Launches next cohort with inherited intelligence | Starting from zero every time |
| 8 | Flywheel | Leadership | Views impact metrics for reporting | Anecdotal budget justification |

---

## What the applicant (startup) experiences

Nothing changes for them. They still email their pitch deck or fill in Cradle's existing application form. NEXUS operates entirely on the PM side. This is a feature, not a limitation — it means zero friction for applicants and zero change management for Cradle's intake process.

In a Phase 2 build, NEXUS could expose an applicant portal (status tracking, session scheduling, milestone visibility) — but that is out of scope for the MVP.

---

## The one-line pitch for judges

> "Your programme managers currently spend 15+ hours per cohort on spreadsheet matching. NEXUS cuts that to 45 minutes — and every cohort that runs makes the next one smarter."
