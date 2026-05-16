import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useToast, SectorBadge, Avatar } from '../components';
import { Check, X, AlertTriangle, Loader, Star } from '../icons';
import { MENTORS, computeEngagement, suggestOutcome } from '../data';

const SummaryStat = ({ label, value, total, color, suffix }) => (
  <div>
    <div className="text-[10.5px] uppercase tracking-wide font-medium text-[var(--nx-text-2)] mb-0.5">{label}</div>
    <div className="flex items-baseline gap-1">
      <span className="text-[22px] font-semibold tabular-nums leading-none" style={{ color }}>{value}</span>
      {total != null && <span className="text-[12px] text-[var(--nx-text-3)]">of {total}</span>}
      {suffix && <span className="text-[12px] text-[var(--nx-text-3)]">{suffix}</span>}
    </div>
  </div>
);

const ResultCard = ({ label, value, sub, color }) => (
  <div className="nx-card p-4">
    <div className="text-[10.5px] uppercase tracking-wide font-medium text-[var(--nx-text-2)]">{label}</div>
    <div className="text-[22px] font-semibold tabular-nums" style={{ color }}>{value}</div>
    <div className="text-[11px] text-[var(--nx-text-3)]">{sub}</div>
  </div>
);

const NpsStars = ({ value, onChange }) => {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex">
      {stars.map(s => {
        const filled = value >= s - 0.25;
        return (
          <button key={s} onClick={() => onChange(s)} className="p-0.5"
                  style={{ color: filled ? "#BA7517" : "#E0DED8" }}>
            <Star size={13} strokeWidth={2}/>
          </button>
        );
      })}
    </div>
  );
};

export default function CloseProgrammeModal({ ecosystem, onClose, onSubmit }) {
  const toast = useToast();
  const matchedPairs = useMemo(() => (
    Object.entries(ecosystem.assignments)
      .map(([cid, mid]) => {
        const company = ecosystem.companies.find(c => c.id === cid);
        const mentor = MENTORS.find(m => m.id === mid);
        if (!company || !mentor) return null;
        return { company, mentor };
      })
      .filter(Boolean)
  ), [ecosystem]);

  const [draft, setDraft] = useState(() => {
    const d = {};
    matchedPairs.forEach(({ company, mentor }) => {
      d[company.id] = suggestOutcome(company, mentor.id);
    });
    return d;
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);

  const set = (cid, patch) => setDraft(prev => ({ ...prev, [cid]: { ...prev[cid], ...patch } }));

  const stats = useMemo(() => {
    const vals = Object.values(draft);
    const graduated = vals.filter(v => v.outcome === "graduated").length;
    const dropped = vals.filter(v => v.outcome === "dropped").length;
    const reuse = vals.filter(v => v.reuse_eligible).length;
    const avgNps = vals.length ? (vals.reduce((s, v) => s + Number(v.mentor_nps), 0) / vals.length) : 0;
    return { graduated, dropped, reuse, avgNps, total: vals.length };
  }, [draft]);

  const handleSubmit = () => {
    setSubmitting(true);
    setSubmitProgress(0);
    let i = 0;
    const total = matchedPairs.length;
    const tick = () => {
      if (i >= total) {
        setSubmitting(false);
        setSubmitted(true);
        onSubmit(draft);
        toast.push(`${total} edges updated with outcome labels · ${stats.reuse} reuse-eligible · Model retraining queued`, "success");
        return;
      }
      i++;
      setSubmitProgress(Math.round((i / total) * 100));
      setTimeout(tick, 40);
    };
    setTimeout(tick, 200);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 nx-fade-in"
         style={{ background: "rgba(20, 20, 18, 0.45)" }}>
      <div className="nx-card w-full max-w-[920px] max-h-[88vh] flex flex-col shadow-xl nx-pop">
        <div className="px-6 py-5 border-b flex items-start justify-between" style={{ borderColor: "var(--nx-border-soft)" }}>
          <div>
            <div className="text-[11px] uppercase tracking-wider font-medium mb-1" style={{ color: "var(--nx-primary)" }}>End of programme</div>
            <h2 className="text-[20px] font-semibold tracking-tight">Close CREST 2026 MY & capture outcomes</h2>
            <p className="text-[13px] text-[var(--nx-text-2)] mt-1 max-w-xl">
              Review the AI-suggested outcomes for each pair. Every edge becomes labelled training data for next cohort's model.
            </p>
          </div>
          <button onClick={onClose} className="text-[var(--nx-text-3)] hover:text-[var(--nx-text)] p-1">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 grid grid-cols-4 gap-4 border-b" style={{ background: "var(--nx-card-subtle)", borderColor: "var(--nx-border-soft)" }}>
          <SummaryStat label="Graduated" value={stats.graduated} total={stats.total} color="#1D9E75" />
          <SummaryStat label="Dropped" value={stats.dropped} total={stats.total} color="#E24B4A" />
          <SummaryStat label="Avg mentor NPS" value={stats.avgNps.toFixed(2)} color="#185FA5" suffix="/ 5" />
          <SummaryStat label="Reuse eligible" value={stats.reuse} total={stats.total} color="#1D9E75" />
        </div>

        {!submitted && (
          <div className="overflow-y-auto flex-1 px-6 py-4">
            <div className="text-[11px] uppercase tracking-wide font-medium text-[var(--nx-text-2)] mb-2">
              {matchedPairs.length} mentor-company pairs
            </div>
            <div className="space-y-2">
              {matchedPairs.map(({ company, mentor }) => {
                const o = draft[company.id] || {};
                const eng = computeEngagement(company, mentor.id);
                return (
                  <div key={company.id} className="rounded-lg border p-3.5 grid grid-cols-[1.1fr_1fr_auto_auto_auto] gap-3 items-center"
                       style={{ borderColor: "var(--nx-border-soft)", background: o.outcome === "dropped" ? "var(--nx-danger-50)" : "var(--nx-card)" }}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-[14px] truncate">{company.name}</span>
                        <SectorBadge sector={company.sector} />
                      </div>
                      <div className="text-[11px] text-[var(--nx-text-3)]">
                        {eng.sessions} sessions · {eng.lastSessionDays != null ? `last ${eng.lastSessionDays}d ago` : "no sessions"}
                        {eng.atRisk && <span className="ml-2" style={{ color: "#E24B4A" }}>● at-risk</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar name={mentor.name} size={26} />
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium truncate">{mentor.name}</div>
                        <div className="text-[11px] text-[var(--nx-text-3)] truncate">{mentor.domain.join(" · ")}</div>
                      </div>
                    </div>
                    <div className="flex items-center rounded-md border overflow-hidden text-[11px]" style={{ borderColor: "var(--nx-border)" }}>
                      <button onClick={() => set(company.id, { outcome: "graduated" })}
                              className="px-2.5 py-1 font-medium"
                              style={{
                                background: o.outcome === "graduated" ? "#1D9E75" : "var(--nx-card)",
                                color: o.outcome === "graduated" ? "#fff" : "var(--nx-text-2)",
                              }}>Graduated</button>
                      <button onClick={() => set(company.id, { outcome: "dropped", reuse_eligible: false })}
                              className="px-2.5 py-1 font-medium border-l"
                              style={{
                                background: o.outcome === "dropped" ? "#E24B4A" : "var(--nx-card)",
                                color: o.outcome === "dropped" ? "#fff" : "var(--nx-text-2)",
                                borderColor: "var(--nx-border)",
                              }}>Dropped</button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10.5px] uppercase tracking-wide text-[var(--nx-text-3)]">NPS</span>
                      <NpsStars value={o.mentor_nps} onChange={(v) => set(company.id, { mentor_nps: v, reuse_eligible: v >= 4.3 && o.outcome === "graduated" })} />
                      <span className="mono text-[11px] tabular-nums w-8">{Number(o.mentor_nps || 0).toFixed(1)}</span>
                    </div>
                    <label className="flex items-center gap-1.5 text-[11px] font-medium cursor-pointer select-none"
                           style={{ color: o.reuse_eligible ? "#1D9E75" : "#9C9B96" }}>
                      <input type="checkbox" checked={!!o.reuse_eligible}
                             disabled={o.outcome === "dropped"}
                             onChange={(e) => set(company.id, { reuse_eligible: e.target.checked })}
                             className="accent-[#1D9E75]" />
                      Reuse
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {submitted && (
          <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                 style={{ background: "var(--nx-success-50)", color: "#1D9E75" }}>
              <Check size={28} />
            </div>
            <h3 className="text-[20px] font-semibold tracking-tight mb-1">Programme closed · outcomes captured</h3>
            <p className="text-[13.5px] text-[var(--nx-text-2)] max-w-md mb-5">
              {stats.total} edges updated with outcome labels and NPS. {stats.reuse} mentors flagged reuse-eligible for the next cohort. XGBoost retraining queued.
            </p>
            <div className="grid grid-cols-3 gap-3 text-left max-w-xl w-full mb-6">
              <ResultCard label="Graduated" value={`${stats.graduated} / ${stats.total}`} sub={`${Math.round(100 * stats.graduated / Math.max(1, stats.total))}% completion`} color="#1D9E75" />
              <ResultCard label="Avg mentor NPS" value={stats.avgNps.toFixed(2)} sub="of 5.00" color="#185FA5" />
              <ResultCard label="Reuse-eligible" value={stats.reuse} sub="available to reactivate" color="#1D9E75" />
            </div>
            <button onClick={onClose} className="nx-btn-primary px-6">Done</button>
          </div>
        )}

        {!submitted && (
          <div className="px-6 py-4 border-t flex items-center gap-3" style={{ borderColor: "var(--nx-border-soft)", background: "var(--nx-card-subtle)" }}>
            <div className="text-[12px] text-[var(--nx-text-3)] flex-1">
              <AlertTriangle size={12} className="inline-block -mt-px mr-1" />
              This action writes {matchedPairs.length} edge updates to the graph and queues model retraining. Cannot be undone.
            </div>
            <button onClick={onClose} className="nx-btn-outline">Cancel</button>
            <button onClick={handleSubmit} disabled={submitting}
                    className="nx-btn-primary flex items-center gap-2">
              {submitting
                ? <><Loader size={14}/> Writing edges… {submitProgress}%</>
                : <><Check size={14}/> End programme & capture outcomes</>}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
