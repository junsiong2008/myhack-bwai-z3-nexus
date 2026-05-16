import { useState, useMemo } from 'react';
import { useToast, SectorBadge, StageBadge, GeoBadge, StatusBadge, Avatar, ProgressBar } from '../components';
import { Zap, Loader, ChevronDown, AlertTriangle, Check, RefreshCw, X } from '../icons';
import { STATUSES } from '../data';
import { bulkAssign, runMatch, PROGRAMME_ID } from '../api';
import CloseProgrammeModal from './CloseProgrammeModal';

function BulkResultPanel({ result, onDismiss }) {
  const outsideCohort = result.skipped?.filter(s => s.reason === "outside_cohort") ?? [];
  const noCapacity    = result.skipped?.filter(s => s.reason === "no_capacity") ?? [];
  return (
    <div className="mt-3 rounded-lg px-4 py-3 flex items-center gap-4 nx-fade-in"
         style={{ background: "#F0F9F5", border: "1px solid #BFE3D2" }}>
      <div className="flex flex-wrap gap-x-5 gap-y-1 flex-1 text-[13px]">
        <span className="flex items-center gap-1.5 font-semibold" style={{ color: "#1D9E75" }}>
          <Check size={13}/> {result.assigned_count} assigned
        </span>
        {outsideCohort.length > 0 && (
          <span className="flex items-center gap-1.5" style={{ color: "var(--nx-text-2)" }}>
            <AlertTriangle size={13}/> {outsideCohort.length} outside cohort limit
          </span>
        )}
        {noCapacity.length > 0 && (
          <span className="flex items-center gap-1.5 font-medium" style={{ color: "#B43938" }}>
            <AlertTriangle size={13}/> {noCapacity.length} skipped — no mentor capacity remaining
          </span>
        )}
        {outsideCohort.length === 0 && noCapacity.length === 0 && (
          <span style={{ color: "var(--nx-text-3)" }}>All eligible companies assigned.</span>
        )}
      </div>
      <button onClick={onDismiss} className="text-[var(--nx-text-3)] hover:text-[var(--nx-text-2)] shrink-0">
        <X size={14}/>
      </button>
    </div>
  );
}

export default function PipelineScreen({ ecosystem, addAssignment, closeProgramme, activateReuseMentors, navigate, refreshData }) {
  const toast = useToast();
  const [statusFilters, setStatusFilters] = useState(new Set());
  const [openRowMenu, setOpenRowMenu] = useState(null);
  const [rowSuggestions, setRowSuggestions] = useState(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkResult, setBulkResult] = useState(null);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [reuseBannerDismissed, setReuseBannerDismissed] = useState(false);

  const mentors = ecosystem.mentors || [];

  const mentorSlotsTotal = mentors.reduce((s, m) => s + (m.capacity_total || 0), 0);
  const mentorSlotsUsed  = mentors.reduce((s, m) => s + (m.capacity_used  || 0), 0);
  const mentorSlotsFree  = mentorSlotsTotal - mentorSlotsUsed;

  const cohortSize   = ecosystem.cohortSize ?? null;
  const cohortFilled = cohortSize != null
    ? ecosystem.companies.slice(0, cohortSize).filter(c => ecosystem.assignments[c.id]).length
    : null;

  const reuseMentorSet = useMemo(() => {
    if (!ecosystem.programmeClosed) return new Set();
    const set = new Set();
    Object.entries(ecosystem.outcomes).forEach(([cid, o]) => {
      if (o.reuse_eligible) {
        const mid = ecosystem.assignments[cid];
        if (mid) set.add(mid);
      }
    });
    return set;
  }, [ecosystem.outcomes, ecosystem.assignments, ecosystem.programmeClosed]);

  const toggleStatus = (s) => {
    setStatusFilters(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  const filtered = ecosystem.companies.filter(c => {
    if (statusFilters.size > 0 && !statusFilters.has(c.status)) return false;
    return true;
  });

  const handleBulkAssign = async () => {
    setBulkRunning(true);
    setBulkProgress(10);
    setBulkResult(null);
    try {
      const data = await bulkAssign(PROGRAMME_ID);
      setBulkProgress(60);
      if (refreshData) await refreshData();
      setBulkProgress(100);
      setBulkResult(data);
      toast.push(data.message || `${data.assigned_count} companies auto-assigned`, "success");
    } catch (err) {
      toast.push(`Bulk assign failed: ${err.message}`, "error");
    }
    setBulkRunning(false);
  };

  const handleOpenRowMenu = async (companyId) => {
    if (openRowMenu === companyId) {
      setOpenRowMenu(null);
      setRowSuggestions(null);
      return;
    }
    setOpenRowMenu(companyId);
    setRowSuggestions(null);
    try {
      const data = await runMatch(companyId, 3);
      setRowSuggestions({ companyId, matches: data.top_matches });
    } catch (err) {
      setRowSuggestions({ companyId, matches: [], error: err.message });
    }
  };

  const handleAssignRow = (company, mentorId) => {
    const m = mentors.find(x => x.id === mentorId);
    addAssignment(company.id, mentorId, "Matched");
    setOpenRowMenu(null);
    setRowSuggestions(null);
    toast.push(`${company.name} assigned to ${m ? m.name : mentorId}`, "success");
  };

  const handleActivateReuse = () => {
    const ids = Array.from(reuseMentorSet);
    activateReuseMentors(ids);
    toast.push(`${ids.length} reuse-eligible mentors activated for CREST 2027 MY`, "success");
  };

  const STATUS_PILLS = ["All", ...STATUSES];

  return (
    <div>
      {ecosystem.programmeClosed && reuseMentorSet.size > 0 && !reuseBannerDismissed && (
        <div className="mb-4 rounded-xl p-4 flex items-center gap-4 nx-fade-in"
             style={{ background: "#E6F5EF", border: "1px solid #BFE3D2" }}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
               style={{ background: "#1D9E75", color: "#fff" }}>
            <RefreshCw size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-semibold leading-tight" style={{ color: "#1f4a3a" }}>
              {reuseMentorSet.size} top-performing mentors available to reactivate for CREST 2027 MY
            </div>
            <div className="text-[12px] mt-0.5" style={{ color: "#3a6a5a" }}>
              These mentors graduated companies with NPS ≥ 4.3 and are pre-verified for re-engagement. One click onboards them all.
            </div>
          </div>
          <div className="flex -space-x-2 mr-2">
            {Array.from(reuseMentorSet).slice(0, 5).map(mid => {
              const m = mentors.find(x => x.id === mid);
              if (!m) return null;
              return <div key={mid} className="ring-2 ring-white rounded-full"><Avatar name={m.name} size={28} /></div>;
            })}
            {reuseMentorSet.size > 5 && (
              <div className="ring-2 ring-white rounded-full w-7 h-7 flex items-center justify-center text-[10.5px] font-semibold"
                   style={{ background: "#1D9E75", color: "#fff" }}>+{reuseMentorSet.size - 5}</div>
            )}
          </div>
          <button onClick={handleActivateReuse} className="nx-btn-success flex items-center gap-1.5 shrink-0">
            <Check size={14} /> Activate all reuse-eligible
          </button>
          <button onClick={() => setReuseBannerDismissed(true)} className="text-[var(--nx-text-3)] hover:text-[var(--nx-text-2)] p-1 shrink-0">
            <X size={16} />
          </button>
        </div>
      )}

      {ecosystem.reactivatedMentors.length > 0 && (
        <div className="mb-4 rounded-xl p-3 flex items-center gap-2 nx-fade-in"
             style={{ background: "#EAF2FB", border: "1px solid #cfdef0" }}>
          <Check size={14} style={{ color: "#185FA5" }} />
          <span className="text-[12.5px]" style={{ color: "#0f3f6f" }}>
            <b>{ecosystem.reactivatedMentors.length} mentors reactivated</b> from CREST 2026 MY — ready for the next cohort's matches.
          </span>
        </div>
      )}

      <div className="nx-card p-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 pr-3 border-r" style={{ borderColor: "var(--nx-border)" }}>
            <span className="text-[11px] uppercase tracking-wide text-[var(--nx-text-2)] font-medium">Programme</span>
            <button className="nx-input py-1.5 px-2.5 text-[13px] flex items-center gap-2 font-medium" style={{ width: "auto" }}>
              CREST 2026 MY <ChevronDown size={14} className="text-[var(--nx-text-3)]" />
            </button>
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {STATUS_PILLS.map(s => {
              const active = s === "All" ? statusFilters.size === 0 : statusFilters.has(s);
              const onClick = () => {
                if (s === "All") setStatusFilters(new Set());
                else toggleStatus(s);
              };
              return (
                <button key={s} onClick={onClick}
                        className="text-[12px] font-medium px-2.5 py-1.5 rounded-full border transition"
                        style={{
                          background: active ? "#185FA5" : "transparent",
                          color: active ? "#fff" : "var(--nx-text-2)",
                          borderColor: active ? "#185FA5" : "var(--nx-border)"
                        }}>
                  {s}
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button onClick={handleBulkAssign} disabled={bulkRunning}
                    className="nx-btn-primary flex items-center gap-2" style={{ width: "auto" }}>
              {bulkRunning ? <><Loader size={14}/> Assigning… {bulkProgress}%</> : <><Zap size={14}/> Bulk AI-assign</>}
            </button>
            {!ecosystem.programmeClosed && (
              <button onClick={() => setCloseModalOpen(true)}
                      className="nx-btn-outline flex items-center gap-2" style={{ width: "auto", borderColor: "#185FA5", color: "#185FA5" }}>
                <Check size={14}/> Close programme
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-4">
          {cohortSize != null && cohortFilled != null && (
            <span className="text-[12px] tabular-nums" style={{ color: "var(--nx-text-3)" }}>
              {cohortFilled} / {cohortSize} cohort assigned
            </span>
          )}
          <span className="text-[12px] tabular-nums" style={{ color: mentorSlotsFree === 0 ? "#B43938" : "var(--nx-text-3)" }}>
            {mentorSlotsFree} / {mentorSlotsTotal} mentor slots free
          </span>
          {bulkRunning && <div className="flex-1"><ProgressBar value={bulkProgress} /></div>}
        </div>

        {bulkResult && !bulkRunning && <BulkResultPanel result={bulkResult} onDismiss={() => setBulkResult(null)} />}
      </div>

      <div className="nx-card overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left" style={{ background: "var(--nx-card-subtle)", borderBottom: "1px solid var(--nx-border)" }}>
              <th className="px-4 py-3 text-[11px] uppercase tracking-wide font-medium text-[var(--nx-text-2)]">Company</th>
              <th className="px-3 py-3 text-[11px] uppercase tracking-wide font-medium text-[var(--nx-text-2)]">Sector</th>
              <th className="px-3 py-3 text-[11px] uppercase tracking-wide font-medium text-[var(--nx-text-2)]">Stage</th>
              <th className="px-3 py-3 text-[11px] uppercase tracking-wide font-medium text-[var(--nx-text-2)]">Geo</th>
              <th className="px-3 py-3 text-[11px] uppercase tracking-wide font-medium text-[var(--nx-text-2)]">Status</th>
              <th className="px-3 py-3 text-[11px] uppercase tracking-wide font-medium text-[var(--nx-text-2)]">Assigned mentor</th>
              <th className="px-3 py-3 text-[11px] uppercase tracking-wide font-medium text-[var(--nx-text-2)] text-right pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, idx) => {
              const mentorId = ecosystem.assignments[c.id];
              const mentor = mentorId ? mentors.find(m => m.id === mentorId) : null;
              const rowMenu = (openRowMenu === c.id && rowSuggestions?.companyId === c.id) ? rowSuggestions : null;
              const suggestions = rowMenu && !rowMenu.error ? rowMenu.matches : null;
              const suggestionsError = rowMenu?.error ?? null;
              const outcome = ecosystem.outcomes[c.id];
              return (
                <tr key={c.id} className="nx-tr"
                    style={{ borderBottom: idx === filtered.length - 1 ? "none" : "1px solid var(--nx-border-soft)" }}>
                  <td className="px-4 py-3">
                    <button onClick={() => navigate("matching", { companyName: c.name })}
                            className="font-semibold text-[var(--nx-text)] hover:underline text-left"
                            style={{ color: "inherit" }}
                            onMouseEnter={e => e.currentTarget.style.color = "var(--nx-primary)"}
                            onMouseLeave={e => e.currentTarget.style.color = "inherit"}>
                      {c.name}
                    </button>
                    <div className="text-[11px] text-[var(--nx-text-3)] mono">{c.id}</div>
                  </td>
                  <td className="px-3 py-3"><SectorBadge sector={c.sector} /></td>
                  <td className="px-3 py-3"><StageBadge stage={c.stage} /></td>
                  <td className="px-3 py-3"><GeoBadge geo={c.geo} /></td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={c.status} />
                      {outcome && outcome.reuse_eligible && (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap"
                              style={{ background: "#E6F5EF", color: "#1D9E75" }}>
                          ♻︎ reuse
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {mentor ? (
                      <div className="flex items-center gap-2">
                        <Avatar name={mentor.name} size={24} />
                        <span className="font-medium">{mentor.name}</span>
                      </div>
                    ) : (
                      <span className="text-[var(--nx-text-3)] italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right pr-4 relative">
                    <button onClick={() => handleOpenRowMenu(c.id)}
                            className="text-[12px] font-medium px-2.5 py-1 rounded-md border"
                            style={{ borderColor: "var(--nx-border)", color: "var(--nx-text)", background: "var(--nx-card)" }}
                            onMouseEnter={e => { e.currentTarget.style.background = "var(--nx-hover)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "var(--nx-card)"; }}>
                      {mentor ? "Reassign" : "Assign"}
                    </button>
                    {(suggestions || suggestionsError) && (
                      <div className="absolute right-4 top-full mt-1 z-10 nx-card shadow-lg w-72 text-left">
                        <div className="px-3 py-2 border-b text-[11px] uppercase tracking-wide text-[var(--nx-text-2)] font-medium" style={{ borderColor: "var(--nx-border-soft)" }}>
                          Top mentor suggestions
                        </div>
                        {suggestionsError ? (
                          <div className="px-3 py-3 text-[12px]" style={{ color: "var(--nx-text-2)" }}>{suggestionsError}</div>
                        ) : suggestions.map(s => (
                          <button key={s.mentor_id} onClick={() => handleAssignRow(c, s.mentor_id)}
                                  className="w-full flex items-center gap-2 px-3 py-2"
                                  onMouseEnter={e => { e.currentTarget.style.background = "var(--nx-hover)"; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                            <Avatar name={s.name} size={26} />
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] font-semibold truncate">{s.name}</div>
                              <div className="text-[10.5px] text-[var(--nx-text-3)] truncate">{s.domain_tags.join(" · ")}</div>
                            </div>
                            <div className="text-[12px] font-semibold tabular-nums" style={{ color: "#185FA5" }}>
                              {Math.round(s.score * 100)}%
                            </div>
                          </button>
                        ))}
                        <div className="px-3 py-1.5 border-t" style={{ borderColor: "var(--nx-border-soft)" }}>
                          <button onClick={() => setOpenRowMenu(null)} className="text-[11px] text-[var(--nx-text-3)] hover:text-[var(--nx-text-2)]">Cancel</button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-16 text-[var(--nx-text-3)]">
                  No companies match — adjust filters or clear search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-[12px] text-[var(--nx-text-3)]">
        <span>Showing {filtered.length} of {ecosystem.companies.length} companies</span>
        <span>Programme: <b className="text-[var(--nx-text-2)]">CREST 2026 MY</b> · {ecosystem.programmeClosed
          ? <span style={{ color: "var(--nx-success)", fontWeight: 600 }}>Closed · outcomes captured</span>
          : "Active · Last sync 2 min ago"}</span>
      </div>

      {closeModalOpen && (
        <CloseProgrammeModal
          ecosystem={ecosystem}
          onClose={() => setCloseModalOpen(false)}
          onSubmit={(draft) => {
            const enriched = {};
            Object.entries(draft).forEach(([cid, o]) => {
              enriched[cid] = { ...o, mentor_id: ecosystem.assignments[cid] };
            });
            closeProgramme(enriched);
          }}
        />
      )}
    </div>
  );
}
