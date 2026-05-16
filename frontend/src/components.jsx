import { useState, useCallback, createContext, useContext } from 'react';
import { Check, AlertTriangle, Sparkles } from './icons';
import { GEOS } from './data';

export const SECTOR_COLORS = {
  Fintech:       { bg: "#EAF2FB", fg: "#185FA5" },
  Agritech:      { bg: "#E6F5EF", fg: "#1D9E75" },
  Healthtech:    { bg: "#E1F2F5", fg: "#1B7C8C" },
  Edtech:        { bg: "#FBF1E1", fg: "#8E5610" },
  Logistics:     { bg: "#EFE9F8", fg: "#5C3A99" },
  Cleantech:     { bg: "#E8F3DC", fg: "#4F7A1F" },
  Proptech:      { bg: "#F5E9F0", fg: "#9B3275" },
  Cybersecurity: { bg: "#FCEAEA", fg: "#B43938" },
  SaaS:          { bg: "#EAF2FB", fg: "#185FA5" },
};

export const STATUS_STYLES = {
  Applied:    { bg: "#FBF1E1", fg: "#8E5610", border: "transparent", filled: true },
  Screening:  { bg: "transparent", fg: "#185FA5", border: "#185FA5", filled: false },
  Accepted:   { bg: "#185FA5", fg: "#FFFFFF", border: "transparent", filled: true },
  Matched:    { bg: "transparent", fg: "#1D9E75", border: "#1D9E75", filled: false },
  Engaged:    { bg: "#1D9E75", fg: "#FFFFFF", border: "transparent", filled: true },
  Graduated:  { bg: "#EFE9F8", fg: "#5C3A99", border: "transparent", filled: true },
};

export const SectorBadge = ({ sector, size = "sm" }) => {
  const c = SECTOR_COLORS[sector] || { bg: "#F0EFEA", fg: "#6B6A65" };
  const pad = size === "lg" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]";
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${pad}`}
          style={{ background: c.bg, color: c.fg }}>{sector}</span>
  );
};

export const StatusBadge = ({ status }) => {
  const s = STATUS_STYLES[status] || STATUS_STYLES.Applied;
  return (
    <span className="inline-flex items-center rounded-full font-medium px-2 py-0.5 text-[11px]"
          style={{ background: s.bg, color: s.fg, border: s.border === "transparent" ? "none" : `1px solid ${s.border}` }}>
      {status}
    </span>
  );
};

export const StageBadge = ({ stage }) => (
  <span className="inline-flex items-center rounded-md font-medium px-2 py-0.5 text-[11px] border"
        style={{ borderColor: "var(--nx-border)", color: "var(--nx-text-2)", background: "var(--nx-card-subtle)" }}>{stage}</span>
);

export const GeoBadge = ({ geo }) => {
  const g = GEOS.find(x => x.code === geo) || { flag: "🌐", code: geo };
  return (
    <span className="inline-flex items-center gap-1 rounded-md font-medium px-1.5 py-0.5 text-[11px]"
          style={{ background: "var(--nx-kbd)", color: "var(--nx-text-2)" }}>
      <span aria-hidden>{g.flag}</span>{g.code}
    </span>
  );
};

export const PriorityBadge = ({ tier }) => {
  const map = {
    High:     { bg: "#E6F5EF", fg: "#1D9E75" },
    Medium:   { bg: "#FBF1E1", fg: "#8E5610" },
    Standard: { bg: "#F0EFEA", fg: "#6B6A65" },
  };
  const c = map[tier] || map.Standard;
  return (
    <span className="inline-flex items-center rounded-full font-medium px-2.5 py-0.5 text-[11px]"
          style={{ background: c.bg, color: c.fg }}>{tier}</span>
  );
};

const AVATAR_PALETTE = ["#185FA5","#1D9E75","#BA7517","#5C3A99","#1B7C8C","#9B3275","#4F7A1F","#B43938","#3A6FB0","#2F8B72"];
export const Avatar = ({ name, size = 32 }) => {
  const initials = name.split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase();
  const hue = name.charCodeAt(0) % AVATAR_PALETTE.length;
  const fontSize = Math.max(11, Math.round(size * 0.38));
  return (
    <div className="inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0"
         style={{ width: size, height: size, background: AVATAR_PALETTE[hue], fontSize }}>{initials}</div>
  );
};

export const MatchScoreBar = ({ score, label = "Match score", showLabel = true }) => {
  const pct = Math.round(score * 100);
  return (
    <div>
      {showLabel && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-[var(--nx-text-2)] font-medium tracking-wide uppercase">{label}</span>
          <span className="text-sm font-semibold tabular-nums">{pct}%</span>
        </div>
      )}
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--nx-hover)" }}>
        <div className="h-full nx-grow rounded-full" style={{ background: "#185FA5", "--nx-w": pct + "%" }} />
      </div>
    </div>
  );
};

export const ProgressBar = ({ value, color = "#185FA5", height = 8, bg }) => (
  <div className="rounded-full overflow-hidden" style={{ height, background: bg || "var(--nx-hover)" }}>
    <div className="h-full nx-grow rounded-full" style={{ background: color, "--nx-w": value + "%" }} />
  </div>
);

export const CapacityBar = ({ used, total }) => (
  <div className="flex gap-1">
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} className="h-1.5 flex-1 rounded-full"
           style={{ background: i < used ? "#185FA5" : "var(--nx-border)" }} />
    ))}
  </div>
);

export const KPICard = ({ label, value, sublabel, Icon: IconC, trend, tooltip }) => (
  <div className="nx-card p-5 flex flex-col gap-3">
    <div className="flex items-start justify-between">
      <span className="text-[12px] font-medium uppercase tracking-wide text-[var(--nx-text-2)]">{label}</span>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center"
           style={{ background: "var(--nx-hover)", color: "var(--nx-text-2)" }}>
        {IconC ? <IconC size={18} /> : null}
      </div>
    </div>
    <div className="flex items-baseline gap-2">
      <span className="text-[32px] font-semibold tracking-tight tabular-nums leading-none">{value}</span>
    </div>
    <div className="text-[12px] text-[var(--nx-text-2)] flex items-center gap-1.5">
      {trend && <span className="text-[var(--nx-success)] font-semibold">↑</span>}
      <span>{sublabel}</span>
      {tooltip && (
        <span className="relative group inline-flex items-center ml-0.5">
          <span className="w-3.5 h-3.5 rounded-full border flex items-center justify-center cursor-default select-none text-[9px] font-semibold leading-none"
                style={{ borderColor: "var(--nx-border)", color: "var(--nx-text-3)" }}>i</span>
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 rounded-lg text-[11.5px] leading-snug pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg"
                style={{ background: "var(--nx-card)", border: "1px solid var(--nx-border)", color: "var(--nx-text-2)" }}>
            {tooltip}
          </span>
        </span>
      )}
    </div>
  </div>
);

const ToastCtx = createContext({ push: () => {} });

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, type = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3800);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map(t => {
          const c = t.type === "success" ? { fg: "#1D9E75", bar: "#1D9E75", IconC: Check }
                  : t.type === "warning" ? { fg: "#BA7517", bar: "#BA7517", IconC: AlertTriangle }
                  : t.type === "error"   ? { fg: "#E24B4A", bar: "#E24B4A", IconC: AlertTriangle }
                  : { fg: "#185FA5", bar: "#185FA5", IconC: Sparkles };
          return (
            <div key={t.id} className="nx-toast pointer-events-auto flex items-start gap-3 border rounded-xl shadow-lg px-4 py-3 max-w-sm"
                 style={{ background: "var(--nx-card)", borderColor: "var(--nx-border)", borderLeftColor: c.bar, borderLeftWidth: 3 }}>
              <div className="mt-0.5" style={{ color: c.fg }}><c.IconC size={16} /></div>
              <div className="text-sm text-[var(--nx-text)] font-medium leading-snug">{t.msg}</div>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
};

export const useToast = () => useContext(ToastCtx);

export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="flex items-end justify-between mb-6">
    <div>
      <h1 className="text-[26px] font-semibold tracking-tight leading-tight">{title}</h1>
      {subtitle && <p className="text-[14px] text-[var(--nx-text-2)] mt-1">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

export const EmptyState = ({ icon: IconC = Sparkles, title, body }) => (
  <div className="flex flex-col items-center justify-center text-center py-16 px-6">
    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
         style={{ background: "var(--nx-hover)", color: "var(--nx-text-3)" }}>
      <IconC size={22} />
    </div>
    <div className="text-[15px] font-semibold text-[var(--nx-text)]">{title}</div>
    <div className="text-[13px] text-[var(--nx-text-2)] max-w-xs mt-1">{body}</div>
  </div>
);
