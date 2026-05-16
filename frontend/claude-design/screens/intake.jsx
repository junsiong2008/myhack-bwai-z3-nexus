// Smart Intake screen
const IntakeScreen = ({ navigate, ecosystem, addCompany }) => {
  const toast = useToast();
  const [pitch, setPitch] = React.useState("");
  const [companyName, setCompanyName] = React.useState("");
  const [teamSize, setTeamSize] = React.useState("");
  const [foundedYear, setFoundedYear] = React.useState("");
  const [parsing, setParsing] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [added, setAdded] = React.useState(false);

  const handleParse = () => {
    if (!pitch.trim()) return;
    setParsing(true);
    setResult(null);
    setAdded(false);
    setTimeout(() => {
      const r = fakeGeminiParse(pitch);
      setResult(r);
      setParsing(false);
    }, 1800);
  };

  const handleAdd = () => {
    const newCompany = {
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
    setTimeout(() => navigate("matching", { companyName: companyName.trim() || "New Applicant" }), 250);
  };

  const useSample = () => {
    setPitch(SAMPLE_PITCH);
    setCompanyName("Tanah");
    setTeamSize("4");
    setFoundedYear("2024");
  };

  return (
    <div className="grid grid-cols-2 gap-6 max-w-[1200px]">
      {/* LEFT */}
      <div>
        <div className="nx-card p-6">
          <div className="flex items-start justify-between mb-1">
            <h2 className="text-[18px] font-semibold tracking-tight">New applicant intake</h2>
            <button className="text-[12px] text-[var(--nx-primary)] font-medium hover:underline"
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
            className="nx-input mt-1.5 mb-4 w-full resize-none text-[14px] leading-relaxed"
            style={{ height: 200, lineHeight: 1.5 }}
          />

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wide text-[var(--nx-text-2)]">Company name</label>
              <input className="nx-input mt-1 w-full" placeholder="Optional"
                     value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wide text-[var(--nx-text-2)]">Team size</label>
              <input className="nx-input mt-1 w-full" placeholder="—" type="number"
                     value={teamSize} onChange={(e) => setTeamSize(e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wide text-[var(--nx-text-2)]">Founded year</label>
              <input className="nx-input mt-1 w-full" placeholder="—" type="number"
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
            <span>Powered by Gemini 1.5 Pro · structured extraction with confidence scoring · ~2s avg latency</span>
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
              {/* Header row */}
              <div className="flex flex-wrap items-center gap-2">
                <SectorBadge sector={result.sector} size="lg" />
                <span className="inline-flex items-center rounded-full font-medium px-2.5 py-1 text-xs"
                      style={{ background: "#FBF1E1", color: "#8E5610" }}>{result.stage}</span>
                <GeoBadge geo={result.geography} />
                <span className="ml-auto"><PriorityBadge tier={result.priority_tier} /></span>
              </div>

              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--nx-text-2)] mb-1.5">Needs</div>
                <div className="flex flex-wrap gap-1.5">
                  {result.needs.map(n => (
                    <span key={n} className="text-[11px] font-medium px-2 py-0.5 rounded-md border"
                          style={{ borderColor: "#E0DED8", background: "#FBFBFA", color: "#1A1A18" }}>{n}</span>
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

              <div className="rounded-lg border p-3 flex gap-2.5"
                   style={{ background: "#FCEAEA", borderColor: "#F0BFBE" }}>
                <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: "#B43938" }} />
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#B43938" }}>Risk flag</div>
                  <div className="text-[13px] text-[var(--nx-text)] mt-0.5">{result.risk_flag}</div>
                </div>
              </div>

              <div>
                <MatchScoreBar score={result.match_readiness / 100} label="Match readiness" />
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={handleAdd} disabled={added}
                        className={added ? "nx-btn-success flex-1 flex items-center justify-center gap-2" : "nx-btn-primary flex-1 flex items-center justify-center gap-2"}>
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
};
window.IntakeScreen = IntakeScreen;
