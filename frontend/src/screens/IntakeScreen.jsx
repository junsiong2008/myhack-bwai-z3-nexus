import { useState, useEffect } from 'react';
import { useToast, SectorBadge, GeoBadge, PriorityBadge, MatchScoreBar, ProgressBar, EmptyState, Avatar, CapacityBar } from '../components';
import { Sparkles, Loader, Brain, FormInput, AlertTriangle, Check, Plus, ArrowRight, X, Zap, Star, RefreshCw } from '../icons';
import { fakeGeminiParse, SAMPLE_PITCH } from '../data';
import { runIntake, adaptIntakeResult, adaptCompany, runMatch } from '../api';

const delay = (ms) => new Promise(res => setTimeout(res, ms));

function IntakeResultCard({ card, addCompany, onRunMatch }) {
  const toast = useToast();
  const { submission, result, intakeCompany, intakeCompanyId } = card;
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    const newCompany = intakeCompany
      ? adaptCompany({ ...intakeCompany, pipeline_status: "Applied" })
      : {
        id: "C_" + String(900 + Math.floor(Math.random() * 99)),
        name: submission.companyName,
        sector: result.sector, stage: result.stage, geo: result.geography,
        status: "Applied", needs: result.needs,
        risk_flag: result.risk_flag, problem: result.problem_statement,
        strength: result.key_strength, match_readiness: result.match_readiness,
        priority: result.priority_tier,
        team_size: submission.teamSize || 3,
        founded: submission.foundedYear || 2025,
      };
    addCompany(newCompany);
    setAdded(true);
    toast.push(`${newCompany.name} added to ecosystem`, "success");
  };

  const handleRunMatch = () => {
    onRunMatch({ card, companyId: intakeCompanyId });
  };

  return (
    <div className="nx-card p-5">
      <div className="font-semibold text-[14px] mb-3 truncate">{submission.companyName}</div>
      <div className="nx-pop space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <SectorBadge sector={result.sector} size="sm" />
          <span className="inline-flex items-center rounded-full font-medium px-2 py-0.5 text-[11px]"
            style={{ background: "var(--nx-warning-50)", color: "#8E5610" }}>{result.stage}</span>
          <GeoBadge geo={result.geography} />
          <span className="ml-auto"><PriorityBadge tier={result.priority_tier} /></span>
        </div>

        <div className="flex flex-wrap gap-1">
          {result.needs.map(n => (
            <span key={n} className="text-[10px] font-medium px-1.5 py-0.5 rounded border"
              style={{ borderColor: "var(--nx-border)", background: "var(--nx-card-subtle)", color: "var(--nx-text)" }}>{n}</span>
          ))}
        </div>

        {result.problem_statement && (
          <p className="text-[12px] italic leading-relaxed" style={{ color: "var(--nx-text-2)" }}>
            "{result.problem_statement}"
          </p>
        )}

        {result.risk_flag && (
          <div className="rounded-lg border p-2.5 flex gap-2"
            style={{ background: "var(--nx-danger-50)", borderColor: "rgba(226,75,74,0.3)" }}>
            <AlertTriangle size={13} className="mt-0.5 shrink-0" style={{ color: "#B43938" }} />
            <div className="text-[11px]" style={{ color: "var(--nx-text)" }}>{result.risk_flag}</div>
          </div>
        )}

        <MatchScoreBar score={result.match_readiness / 100} label="Match readiness" />

        <div className="flex gap-2 pt-1">
          <button onClick={handleAdd} disabled={added}
            className={`${added ? "nx-btn-success" : "nx-btn-primary"} flex-1 flex items-center justify-center gap-1.5 text-[12px] py-1.5`}>
            {added ? <><Check size={13} /> Added</> : <><Plus size={13} /> Add to ecosystem</>}
          </button>
          <button onClick={handleRunMatch}
            className="nx-btn-outline flex-1 flex items-center justify-center gap-1.5 text-[12px] py-1.5"
            style={{ borderColor: "#185FA5", color: "#185FA5" }}>
            Run AI match <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function MatchPanel({ companyId, card, addCompany, addAssignment, onClose }) {
  const toast = useToast();
  const { submission, result, intakeCompany } = card;
  const [matching, setMatching] = useState(true);
  const [matches, setMatches] = useState(null);
  const [totalEvaluated, setTotalEvaluated] = useState(null);
  const [approved, setApproved] = useState({});
  const [skipped, setSkipped] = useState({});
  const [ecosystemAdded, setEcosystemAdded] = useState(false);

  const ensureInEcosystem = () => {
    if (ecosystemAdded) return;
    const newCompany = intakeCompany
      ? adaptCompany({ ...intakeCompany, pipeline_status: "Applied" })
      : {
          id: companyId || "C_" + String(900 + Math.floor(Math.random() * 99)),
          name: submission.companyName,
          sector: result.sector, stage: result.stage, geo: result.geography,
          status: "Applied", needs: result.needs,
          risk_flag: result.risk_flag, problem: result.problem_statement,
          strength: result.key_strength, match_readiness: result.match_readiness,
          priority: result.priority_tier,
          team_size: submission.teamSize || 3,
          founded: submission.foundedYear || 2025,
        };
    addCompany(newCompany);
    setEcosystemAdded(true);
  };

  const runMatchFor = async () => {
    setMatching(true);
    setMatches(null);
    setApproved({});
    setSkipped({});
    try {
      const data = await runMatch(companyId, 3);
      setMatches(data.top_matches);
      setTotalEvaluated(data.total_evaluated);
    } catch (err) {
      setMatches({ error: err.message });
    } finally {
      setMatching(false);
    }
  };

  useEffect(() => { runMatchFor(); }, [companyId]);

  const handleApprove = (m) => {
    ensureInEcosystem();
    setApproved(a => ({ ...a, [m.mentor_id]: true }));
    addAssignment(companyId, m.mentor_id, "Matched");
    toast.push(`${submission.companyName} matched to ${m.name}`, "success");
  };
  const handleSkip = (m) => setSkipped(s => ({ ...s, [m.mentor_id]: true }));

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[460px] flex flex-col nx-fade-in"
           style={{ background: "var(--nx-surface)", borderLeft: "1px solid var(--nx-border)" }}>

        {/* Panel header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b shrink-0"
             style={{ borderColor: "var(--nx-border)", background: "var(--nx-card)" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
               style={{ background: "var(--nx-primary-50)" }}>
            <Zap size={15} style={{ color: "#185FA5" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[14px] truncate">{submission.companyName}</div>
            <div className="text-[11px]" style={{ color: "var(--nx-text-3)" }}>AI Match Engine</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md transition"
                  style={{ color: "var(--nx-text-2)" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--nx-hover)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
            <X size={18} />
          </button>
        </div>

        {/* Company summary */}
        <div className="px-5 py-3 border-b shrink-0" style={{ borderColor: "var(--nx-border-soft)", background: "var(--nx-card-subtle)" }}>
          <div className="flex flex-wrap gap-1.5 mb-2">
            <SectorBadge sector={result.sector} />
            <span className="inline-flex items-center rounded-full font-medium px-2 py-0.5 text-[11px]"
                  style={{ background: "var(--nx-warning-50)", color: "#8E5610" }}>{result.stage}</span>
            <GeoBadge geo={result.geography} />
          </div>
          <div className="flex flex-wrap gap-1">
            {result.needs.map(n => (
              <span key={n} className="text-[10px] font-medium px-1.5 py-0.5 rounded border"
                    style={{ borderColor: "var(--nx-border)", background: "var(--nx-card)", color: "var(--nx-text)" }}>{n}</span>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {matching && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="nx-pulsebar flex items-end gap-1.5 mb-4 h-12">
                {[24, 36, 28, 40, 32].map((h, i) => (
                  <div key={i} className="w-2.5 rounded-sm" style={{ height: h, background: "#185FA5" }} />
                ))}
              </div>
              <div className="text-[13px] mono" style={{ color: "var(--nx-text-2)" }}>
                Scoring · domain alignment · stage · NPS · capacity
              </div>
            </div>
          )}

          {matches?.error && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertTriangle size={24} className="mb-3" style={{ color: "var(--nx-text-3)" }} />
              <div className="text-[13px] font-medium mb-1">Match failed</div>
              <div className="text-[12px]" style={{ color: "var(--nx-text-3)" }}>{matches.error}</div>
            </div>
          )}

          {matches && !matches.error && (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] uppercase tracking-wide font-medium" style={{ color: "var(--nx-text-3)" }}>
                  Top {matches.length}{totalEvaluated ? ` of ${totalEvaluated}` : ""} mentors
                </span>
                <button onClick={runMatchFor}
                        className="text-[11px] flex items-center gap-1 hover:underline"
                        style={{ color: "var(--nx-text-3)" }}>
                  <RefreshCw size={11} /> Re-rank
                </button>
              </div>
              {matches.map((m, idx) => (
                <div key={m.mentor_id}
                     className="rounded-xl border p-4 transition"
                     style={{
                       background: approved[m.mentor_id] ? "var(--nx-success-50)" : "var(--nx-card)",
                       borderColor: approved[m.mentor_id] ? "#1D9E75" : "var(--nx-border)",
                       opacity: skipped[m.mentor_id] ? 0.5 : 1,
                     }}>
                  {approved[m.mentor_id] && (
                    <div className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full mb-2"
                         style={{ background: "#1D9E75", color: "#fff" }}>
                      <Check size={11} /> Matched
                    </div>
                  )}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="relative">
                      <Avatar name={m.name} size={40} />
                      <span className="absolute -top-1 -left-1 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center"
                            style={{ background: "var(--nx-text)", color: "var(--nx-surface)" }}>{idx + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-semibold">{m.name}</span>
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded"
                              style={{ background: "#E6F5EF", color: "#1D9E75" }}>
                          NPS {m.nps.toFixed(1)} <Star size={10} />
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {m.domain_tags.map(d => (
                          <span key={d} className="text-[10px] px-1.5 py-0.5 rounded"
                                style={{ background: "var(--nx-kbd)", color: "var(--nx-text-2)" }}>{d}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <MatchScoreBar score={m.score} />
                  <p className="text-[12px] italic mt-2 mb-3 leading-relaxed" style={{ color: "var(--nx-text-2)" }}>
                    "{m.explanation}"
                  </p>
                  <div className="mb-3">
                    <div className="text-[11px] mb-1" style={{ color: "var(--nx-text-3)" }}>
                      Capacity: <span className="font-medium" style={{ color: "var(--nx-text-2)" }}>{m.capacity_used}/{m.capacity_total} slots used</span>
                    </div>
                    <CapacityBar used={m.capacity_used} total={m.capacity_total} />
                  </div>
                  {!approved[m.mentor_id] && !skipped[m.mentor_id] && (
                    <div className="flex gap-2">
                      <button onClick={() => handleApprove(m)} className="nx-btn-success flex-1 flex items-center justify-center gap-1.5 text-[13px]">
                        <Check size={13} /> Approve
                      </button>
                      <button onClick={() => handleSkip(m)} className="nx-btn-outline flex-1 text-[13px]">Skip</button>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function IntakeScreen({ navigate, addCompany, addAssignment, pendingApplications = [], clearPendingApplications }) {
  const toast = useToast();
  const [pitch, setPitch] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [foundedYear, setFoundedYear] = useState("");
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState(null);
  const [added, setAdded] = useState(false);
  const [intakeCompanyId, setIntakeCompanyId] = useState(null);
  const [intakeCompany, setIntakeCompany] = useState(null);

  const handleParse = async () => {
    if (!pitch.trim()) return;
    setParsing(true);
    setResult(null);
    setAdded(false);
    setIntakeCompanyId(null);
    setIntakeCompany(null);
    try {
      const data = await runIntake({
        company_name: companyName.trim() || "New Applicant",
        pitch_text: pitch,
        team_size: teamSize ? Number(teamSize) : undefined,
        founding_year: foundedYear ? Number(foundedYear) : undefined,
      });
      setResult(adaptIntakeResult(data.extraction, data.company));
      setIntakeCompanyId(data.company_id);
      setIntakeCompany(data.company);
    } catch (err) {
      console.warn("Intake API unavailable, using fallback:", err.message);
      setResult(fakeGeminiParse(pitch));
      toast.push("Using local fallback (API unavailable)", "warning");
    } finally {
      setParsing(false);
    }
  };

  const handleAdd = () => {
    const newCompany = intakeCompany
      ? adaptCompany({ ...intakeCompany, pipeline_status: "Applied" })
      : {
        id: "C_" + String(900 + Math.floor(Math.random() * 99)),
        name: companyName.trim() || "New Applicant",
        sector: result.sector, stage: result.stage, geo: result.geography,
        status: "Applied", needs: result.needs,
        risk_flag: result.risk_flag, problem: result.problem_statement,
        strength: result.key_strength, match_readiness: result.match_readiness,
        priority: result.priority_tier,
        team_size: Number(teamSize) || 3, founded: Number(foundedYear) || 2025,
      };
    addCompany(newCompany);
    setAdded(true);
    toast.push(`${newCompany.name} added to ecosystem`, "success");
  };

  const handleRunMatch = () => {
    if (!added) handleAdd();
    const name = intakeCompany?.name || companyName.trim() || "New Applicant";
    const id = intakeCompanyId || null;
    setTimeout(() => navigate("matching", { companyName: name, companyId: id }), 250);
  };

  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [processedCards, setProcessedCards] = useState([]);
  const [batchDone, setBatchDone] = useState(false);
  const [matchPanel, setMatchPanel] = useState(null);

  const handleProcessAll = async () => {
    setBatchProcessing(true);
    setBatchProgress(0);
    setProcessedCards([]);
    setBatchDone(false);
    for (let i = 0; i < pendingApplications.length; i++) {
      setBatchProgress(i + 1);
      const sub = pendingApplications[i];
      let result;
      let intakeCompany = null;
      let intakeCompanyId = null;
      try {
        const data = await runIntake({
          company_name: sub.companyName,
          pitch_text: sub.pitch,
          team_size: sub.teamSize,
          founding_year: sub.foundedYear,
        });
        result = adaptIntakeResult(data.extraction, data.company);
        intakeCompany = data.company;
        intakeCompanyId = data.company_id;
      } catch {
        result = fakeGeminiParse(sub.pitch);
      }
      setProcessedCards(prev => [...prev, { submission: sub, result, intakeCompany, intakeCompanyId }]);
      if (i < pendingApplications.length - 1) await delay(500);
    }
    setBatchProcessing(false);
    setBatchDone(true);
    clearPendingApplications();
  };

  const handleAddAll = () => {
    processedCards.forEach(card => {
      const newCompany = card.intakeCompany
        ? adaptCompany({ ...card.intakeCompany, pipeline_status: "Applied" })
        : {
          id: "C_" + String(900 + Math.floor(Math.random() * 99)),
          name: card.submission.companyName,
          sector: card.result.sector, stage: card.result.stage, geo: card.result.geography,
          status: "Applied", needs: card.result.needs,
          risk_flag: card.result.risk_flag, problem: card.result.problem_statement,
          strength: card.result.key_strength, match_readiness: card.result.match_readiness,
          priority: card.result.priority_tier,
          team_size: card.submission.teamSize || 3,
          founded: card.submission.foundedYear || 2025,
        };
      addCompany(newCompany);
    });
    toast.push(`${processedCards.length} companies added to ecosystem`, "success");
  };

  const useSample = () => {
    setPitch(SAMPLE_PITCH);
    setCompanyName("Tanah");
    setTeamSize("4");
    setFoundedYear("2024");
  };

  return (
    <div className="max-w-[1200px]">
      {/* Pending applications banner */}
      {pendingApplications.length > 0 && !batchProcessing && !batchDone && (
        <div className="mb-6 flex items-center gap-4 px-5 py-4 rounded-xl border"
          style={{ background: "var(--nx-warning-50)", borderColor: "rgba(186,117,23,0.3)" }}>
          <div>
            <span className="text-[14px] font-semibold" style={{ color: "#8E5610" }}>
              {pendingApplications.length} new application{pendingApplications.length > 1 ? "s" : ""} received
            </span>
            <p className="text-[12px] mt-0.5" style={{ color: "#BA7517" }}>
              Review and process them with Gemini to extract structured profiles.
            </p>
          </div>
          <button onClick={handleProcessAll} className="nx-btn-primary ml-auto shrink-0">
            Process Now
          </button>
        </div>
      )}

      {/* Batch processing progress */}
      {batchProcessing && (
        <div className="mb-6 px-5 py-4 rounded-xl border"
          style={{ background: "var(--nx-card)", borderColor: "var(--nx-border)" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-medium">
              Processing {batchProgress} of {pendingApplications.length}…
            </span>
            <span className="text-[12px] mono" style={{ color: "var(--nx-text-3)" }}>
              {Math.round((batchProgress / pendingApplications.length) * 100)}%
            </span>
          </div>
          <ProgressBar value={(batchProgress / pendingApplications.length) * 100} />
        </div>
      )}

      {/* Empty state */}
      {pendingApplications.length === 0 && processedCards.length === 0 && !batchProcessing && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
               style={{ background: "var(--nx-card-subtle)", border: "1px solid var(--nx-border)" }}>
            <FormInput size={22} style={{ color: "var(--nx-text-3)" }} />
          </div>
          <h3 className="text-[16px] font-semibold tracking-tight mb-1">No pending applications</h3>
          <p className="text-[13px] max-w-sm" style={{ color: "var(--nx-text-2)" }}>
            Applications submitted through the Applicant Portal will appear here for review and processing.
          </p>
        </div>
      )}

      {/* Processed cards grid */}
      {processedCards.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[14px] font-semibold">
              {batchDone
                ? `${processedCards.length} application${processedCards.length > 1 ? "s" : ""} processed`
                : `Processed ${processedCards.length} so far…`}
            </span>
            {batchDone && (
              <button onClick={handleAddAll} className="nx-btn-primary">
                Add all to ecosystem
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[520px] overflow-y-auto pr-1">
            {processedCards.map((card, i) => (
              <IntakeResultCard key={i} card={card} addCompany={addCompany}
                onRunMatch={({ card, companyId }) => setMatchPanel({ card, companyId })} />
            ))}
          </div>
        </div>
      )}


    {matchPanel && (
      <MatchPanel
        companyId={matchPanel.companyId}
        card={matchPanel.card}
        addCompany={addCompany}
        addAssignment={addAssignment}
        onClose={() => setMatchPanel(null)}
      />
    )}
    </div>
  );
}