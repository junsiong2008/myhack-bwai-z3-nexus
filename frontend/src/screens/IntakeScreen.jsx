import { useState } from 'react';
import { useToast, SectorBadge, GeoBadge, PriorityBadge, MatchScoreBar, ProgressBar, EmptyState } from '../components';
import { Sparkles, Loader, Brain, FormInput, AlertTriangle, Check, Plus, ArrowRight } from '../icons';
import { fakeGeminiParse, SAMPLE_PITCH } from '../data';
import { runIntake, adaptIntakeResult, adaptCompany } from '../api';

const delay = (ms) => new Promise(res => setTimeout(res, ms));

function IntakeResultCard({ card, addCompany, navigate }) {
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
    if (!added) handleAdd();
    setTimeout(() => navigate("matching", { companyName: submission.companyName, companyId: intakeCompanyId || null }), 250);
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

export default function IntakeScreen({ navigate, addCompany, pendingApplications = [], clearPendingApplications }) {
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
              <IntakeResultCard key={i} card={card} addCompany={addCompany} navigate={navigate} />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}