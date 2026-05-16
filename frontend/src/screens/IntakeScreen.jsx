import { useState } from 'react';
import { useToast, SectorBadge, GeoBadge, PriorityBadge, MatchScoreBar, EmptyState } from '../components';
import { Sparkles, Loader, Brain, FormInput, AlertTriangle, Check, Plus, ArrowRight } from '../icons';
import { fakeGeminiParse, SAMPLE_PITCH } from '../data';
import { runIntake, adaptIntakeResult, adaptCompany } from '../api';

export default function IntakeScreen({ navigate, ecosystem, addCompany }) {
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

  const useSample = () => {
    setPitch(SAMPLE_PITCH);
    setCompanyName("Tanah");
    setTeamSize("4");
    setFoundedYear("2024");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[1200px]">
      {/* LEFT */}
      <div>
        <div className="nx-card p-6">
          <div className="flex items-start justify-between mb-1">
            <h2 className="text-[18px] font-semibold tracking-tight">New applicant intake</h2>
            <button className="text-[12px] font-medium hover:underline"
                    style={{ color: "var(--nx-primary)" }}
                    onClick={useSample}>Use sample pitch</button>
          </div>
          <p className="text-[13px] text-[var(--nx-text-2)] mb-5">
            Paste a pitch or company description below. Gemini will extract the structured profile automatically.
          </p>

          <label className="text-[12px] font-medium uppercase tracking-wide text-[var(--nx-text-2)]">Pitch description</label>
          <textarea
            value={pitch}
            onChange={(e) => setPitch(e.target.value)}
            placeholder="e.g. We are a fintech SaaS startup building automated reconciliation tools for SMEs in Southeast Asia..."
            className="nx-input mt-1.5 mb-4 resize-none text-[14px] leading-relaxed"
            style={{ height: 200, lineHeight: 1.5 }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wide text-[var(--nx-text-2)]">Company name</label>
              <input className="nx-input mt-1" placeholder="Optional"
                     value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wide text-[var(--nx-text-2)]">Team size</label>
              <input className="nx-input mt-1" placeholder="—" type="number"
                     value={teamSize} onChange={(e) => setTeamSize(e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wide text-[var(--nx-text-2)]">Founded year</label>
              <input className="nx-input mt-1" placeholder="—" type="number"
                     value={foundedYear} onChange={(e) => setFoundedYear(e.target.value)} />
            </div>
          </div>

          <button onClick={handleParse} disabled={parsing || !pitch.trim()}
                  className="nx-btn-primary w-full flex items-center justify-center gap-2">
            {parsing
              ? <><Loader size={16} /> Parsing…</>
              : <><Sparkles size={16} /> Parse with Gemini</>
            }
          </button>

          <div className="mt-4 flex items-start gap-2 text-[12px] text-[var(--nx-text-3)]">
            <Brain size={14} className="mt-px shrink-0" />
            <span>Powered by Gemini Flash · structured extraction with confidence scoring · FastAPI backend on :8000</span>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div>
        <div className="nx-card p-6 min-h-[560px] relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[18px] font-semibold tracking-tight">Extracted profile</h2>
            {result && (
              <span className="text-[11px] mono text-[var(--nx-text-3)]">
                Confidence: <span className="text-[var(--nx-text)] font-semibold">{result.confidence}%</span>
              </span>
            )}
          </div>
          <p className="text-[13px] text-[var(--nx-text-2)] mb-5">
            {result ? "Verify the fields below, then add to the ecosystem." : "Waiting for input — the AI-extracted profile will appear here."}
          </p>

          {!result && !parsing && (
            <EmptyState icon={FormInput}
              title="No pitch parsed yet"
              body="Paste a description and run Gemini to extract the structured profile." />
          )}

          {parsing && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="nx-pulsebar flex items-end gap-1.5 mb-4 h-12">
                {[18, 30, 24, 36].map((h, i) => (
                  <div key={i} className="w-2 rounded-sm" style={{ height: h, background: "#185FA5" }} />
                ))}
              </div>
              <div className="text-[13px] text-[var(--nx-text-2)] mono">Extracting sector · stage · needs · risks…</div>
            </div>
          )}

          {result && (
            <div className="nx-pop space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <SectorBadge sector={result.sector} size="lg" />
                <span className="inline-flex items-center rounded-full font-medium px-2.5 py-1 text-xs"
                      style={{ background: "var(--nx-warning-50)", color: "#8E5610" }}>{result.stage}</span>
                <GeoBadge geo={result.geography} />
                <span className="ml-auto"><PriorityBadge tier={result.priority_tier} /></span>
              </div>

              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--nx-text-2)] mb-1.5">Needs</div>
                <div className="flex flex-wrap gap-1.5">
                  {result.needs.map(n => (
                    <span key={n} className="text-[11px] font-medium px-2 py-0.5 rounded-md border"
                          style={{ borderColor: "var(--nx-border)", background: "var(--nx-card-subtle)", color: "var(--nx-text)" }}>{n}</span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--nx-text-2)] mb-1">Problem statement</div>
                <p className="text-[13.5px] italic text-[var(--nx-text)] leading-relaxed">"{result.problem_statement}"</p>
              </div>

              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--nx-text-2)] mb-1">Key strength</div>
                <p className="text-[13.5px] text-[var(--nx-text)] leading-relaxed">{result.key_strength}</p>
              </div>

              {result.risk_flag && (
                <div className="rounded-lg border p-3 flex gap-2.5"
                     style={{ background: "var(--nx-danger-50)", borderColor: "rgba(226,75,74,0.3)" }}>
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: "#B43938" }} />
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#B43938" }}>Risk flag</div>
                    <div className="text-[13px] text-[var(--nx-text)] mt-0.5">{result.risk_flag}</div>
                  </div>
                </div>
              )}

              <div>
                <MatchScoreBar score={result.match_readiness / 100} label="Match readiness" />
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={handleAdd} disabled={added}
                        className={`${added ? "nx-btn-success" : "nx-btn-primary"} flex-1 flex items-center justify-center gap-2`}>
                  {added ? <><Check size={16} /> Added to ecosystem</> : <><Plus size={16} /> Add to ecosystem</>}
                </button>
                <button onClick={handleRunMatch}
                        className="nx-btn-outline flex-1 flex items-center justify-center gap-2"
                        style={{ borderColor: "#185FA5", color: "#185FA5" }}>
                  Run AI match now <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
