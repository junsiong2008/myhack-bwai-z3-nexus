import { useState, useEffect } from 'react';
import { useToast, SectorBadge, StageBadge, GeoBadge, StatusBadge, Avatar, MatchScoreBar, CapacityBar, EmptyState } from '../components';
import { Zap, Loader, ChevronDown, AlertTriangle, Check, Star, RefreshCw } from '../icons';
import { fakeMatch, MENTORS } from '../data';

function MentorCard({ mentor, rank, approved, skipped, onApprove, onSkip }) {
  return (
    <div className="relative rounded-xl border p-4 transition"
         style={{
           background: approved ? "var(--nx-success-50)" : "var(--nx-card)",
           borderColor: approved ? "#1D9E75" : "var(--nx-border)",
           opacity: skipped ? 0.55 : 1
         }}>
      {approved && (
        <div className="absolute top-3 right-3 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
             style={{ background: "#1D9E75", color: "#fff" }}>
          <Check size={12}/> Matched
        </div>
      )}

      <div className="flex items-start gap-3 mb-3">
        <div className="relative">
          <Avatar name={mentor.name} size={44} />
          <span className="absolute -top-1 -left-1 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: "var(--nx-text)", color: "var(--nx-surface)" }}>{rank}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-[15px] font-semibold tracking-tight">{mentor.name}</h4>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded"
                  style={{ background: "#E6F5EF", color: "#1D9E75" }}>
              NPS {mentor.nps.toFixed(1)} <Star size={10}/>
            </span>
            {mentor.reuse_eligible && (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded-full"
                    style={{ background: "#E6F5EF", color: "#1D9E75" }}>
                <Check size={10}/> Reuse eligible
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {mentor.domain_tags.map(d => (
              <span key={d} className="text-[11px] px-1.5 py-0.5 rounded"
                    style={{ background: "var(--nx-kbd)", color: "var(--nx-text-2)" }}>{d}</span>
            ))}
            <span className="text-[11px] px-1.5 py-0.5 rounded"
                  style={{ background: "var(--nx-kbd)", color: "var(--nx-text-2)" }}>{mentor.geography}</span>
          </div>
        </div>
      </div>

      <MatchScoreBar score={mentor.score} />

      <p className="text-[12.5px] italic text-[var(--nx-text-2)] mt-3 leading-relaxed">
        "{mentor.explanation}"
      </p>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex-1">
          <div className="text-[11px] text-[var(--nx-text-3)] mb-1">
            Capacity: <span className="font-medium text-[var(--nx-text-2)]">{mentor.capacity_used}/{mentor.capacity_total} slots used</span>
          </div>
          <CapacityBar used={mentor.capacity_used} total={mentor.capacity_total} />
        </div>
      </div>

      {!approved && !skipped && (
        <div className="flex gap-2 mt-4">
          <button onClick={onApprove} className="nx-btn-success flex-1 flex items-center justify-center gap-1.5">
            <Check size={14}/> Approve
          </button>
          <button onClick={onSkip} className="nx-btn-outline flex-1">Skip</button>
        </div>
      )}
    </div>
  );
}

export default function MatchingScreen({ navigate, ecosystem, addAssignment, preselect }) {
  const toast = useToast();
  const [selectedId, setSelectedId] = useState(null);
  const [matching, setMatching] = useState(false);
  const [results, setResults] = useState(null);
  const [approved, setApproved] = useState({});
  const [skipped, setSkipped] = useState({});
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const runMatchFor = (companyId) => {
    const c = ecosystem.companies.find(x => x.id === companyId);
    if (!c) return;
    setMatching(true);
    setResults(null);
    setApproved({});
    setSkipped({});
    setTimeout(() => {
      setResults(fakeMatch(c, 3));
      setMatching(false);
    }, 1600);
  };

  useEffect(() => {
    if (preselect && preselect.companyName) {
      const c = ecosystem.companies.find(x => x.name === preselect.companyName);
      if (c) {
        setSelectedId(c.id);
        setTimeout(() => runMatchFor(c.id), 400);
      }
    }
  }, []);

  const company = selectedId ? ecosystem.companies.find(c => c.id === selectedId) : null;

  const handleSelect = (id) => {
    setSelectedId(id);
    setResults(null);
    setApproved({});
    setSkipped({});
    setDropdownOpen(false);
  };

  const handleApprove = (m) => {
    setApproved(a => ({ ...a, [m.mentor_id]: true }));
    addAssignment(company.id, m.mentor_id);
    toast.push("Edge written to graph", "success");
  };
  const handleSkip = (m) => setSkipped(s => ({ ...s, [m.mentor_id]: true }));

  return (
    <div className="grid grid-cols-[420px_1fr] gap-6">
      {/* LEFT */}
      <div>
        <div className="nx-card p-6">
          <h2 className="text-[18px] font-semibold tracking-tight mb-1">AI match engine</h2>
          <p className="text-[13px] text-[var(--nx-text-2)] mb-5">
            Select a company. NEXUS will rank mentors using domain, stage, capacity and historical NPS.
          </p>

          <label className="text-[11px] font-medium uppercase tracking-wide text-[var(--nx-text-2)]">Select a company</label>
          <div className="relative mt-1.5">
            <button onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="nx-input w-full flex items-center justify-between text-left">
              {company
                ? <span className="flex items-center gap-2"><span className="font-medium">{company.name}</span><SectorBadge sector={company.sector} /></span>
                : <span className="text-[var(--nx-text-3)]">Choose a company…</span>}
              <ChevronDown size={16} className="text-[var(--nx-text-3)]" />
            </button>
            {dropdownOpen && (
              <div className="absolute z-10 top-full mt-1 left-0 right-0 nx-card max-h-72 overflow-y-auto shadow-lg">
                {ecosystem.companies.map(c => (
                  <button key={c.id} onClick={() => handleSelect(c.id)}
                          className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-[#F3F1EC]">
                    <span className="text-[13px] font-medium">{c.name}</span>
                    <span className="flex items-center gap-1.5">
                      <SectorBadge sector={c.sector} />
                      <GeoBadge geo={c.geo} />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {company && (
            <div className="mt-5 nx-pop">
              <div className="rounded-xl border p-4" style={{ borderColor: "var(--nx-border)", background: "var(--nx-card-subtle)" }}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[17px] font-semibold tracking-tight">{company.name}</h3>
                  <StatusBadge status={company.status} />
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <SectorBadge sector={company.sector} />
                  <StageBadge stage={company.stage} />
                  <GeoBadge geo={company.geo} />
                </div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--nx-text-2)] mb-1">Needs</div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {company.needs.map(n => (
                    <span key={n} className="text-[11px] px-1.5 py-0.5 rounded border"
                          style={{ borderColor: "var(--nx-border)", background: "var(--nx-card)", color: "var(--nx-text)" }}>{n}</span>
                  ))}
                </div>
                <p className="text-[12.5px] text-[var(--nx-text-2)] italic mb-3 leading-relaxed">"{company.problem}"</p>
                {company.risk_flag && (
                  <div className="rounded-md border p-2 flex gap-2 text-[12px]"
                       style={{ background: "#FCEAEA", borderColor: "#F0BFBE", color: "#8a2c2b" }}>
                    <AlertTriangle size={14} className="mt-px shrink-0" />
                    <span><b>Risk:</b> {company.risk_flag}</span>
                  </div>
                )}
              </div>

              <button onClick={() => runMatchFor(company.id)} disabled={matching}
                      className="nx-btn-primary w-full mt-4 flex items-center justify-center gap-2">
                {matching ? <><Loader size={16}/> Matching…</> : <><Zap size={16} /> Run AI match engine</>}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT */}
      <div>
        <div className="nx-card p-6 min-h-[560px]">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[18px] font-semibold tracking-tight">Match results</h2>
            {results && (
              <span className="text-[12px] text-[var(--nx-text-2)]">
                <span className="mono">XGBoost v0.8722</span> · top {results.length} of {MENTORS.length} mentors
              </span>
            )}
          </div>
          <p className="text-[13px] text-[var(--nx-text-2)] mb-5">
            {company ? `Ranked recommendations for ${company.name}` : "Select a company and run the match engine"}
          </p>

          {!company && (
            <EmptyState icon={Zap}
              title="No company selected"
              body="Pick a company from the dropdown to see ranked mentor recommendations." />
          )}

          {company && !results && !matching && (
            <EmptyState icon={Zap}
              title="Ready to match"
              body={`Click 'Run AI match engine' to rank mentors for ${company.name}.`} />
          )}

          {matching && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="nx-pulsebar flex items-end gap-1.5 mb-4 h-14">
                {[24, 36, 28, 40, 32].map((h, i) => (
                  <div key={i} className="w-2.5 rounded-sm" style={{ height: h, background: "#185FA5" }} />
                ))}
              </div>
              <div className="text-[13px] text-[var(--nx-text-2)] mono">
                Scoring · domain alignment · stage maturity · NPS · capacity
              </div>
            </div>
          )}

          {results && (
            <div className="space-y-3 nx-fade-in">
              {results.map((m, idx) => (
                <MentorCard key={m.mentor_id}
                            mentor={m} rank={idx + 1}
                            approved={approved[m.mentor_id]}
                            skipped={skipped[m.mentor_id]}
                            onApprove={() => handleApprove(m)}
                            onSkip={() => handleSkip(m)} />
              ))}
              <div className="text-center pt-2">
                <button onClick={() => runMatchFor(company.id)}
                        className="text-[12px] text-[var(--nx-text-2)] hover:text-[var(--nx-primary)] inline-flex items-center gap-1">
                  <RefreshCw size={12} /> Re-rank
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
