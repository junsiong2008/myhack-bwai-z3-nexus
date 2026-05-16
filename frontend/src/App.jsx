import { useState, useEffect, useCallback } from 'react';
import { ToastProvider } from './components';
import { LayoutGrid, Workflow, Zap, FormInput, Share2, RefreshCw, Search, Bell, ChevronDown, Moon, Sun } from './icons';
import DashboardScreen from './screens/DashboardScreen';
import IntakeScreen from './screens/IntakeScreen';
import MatchingScreen from './screens/MatchingScreen';
import PipelineScreen from './screens/PipelineScreen';
import GraphScreen from './screens/GraphScreen';
import FlywheelScreen from './screens/FlywheelScreen';
import ApplicantScreen from './screens/ApplicantScreen';
import { fetchCompanies, fetchMentors, assignMentor, PROGRAMME_ID } from './api';

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard",           icon: LayoutGrid },
  { key: "pipeline",  label: "Programme Pipeline",  icon: Workflow   },
  { key: "matching",  label: "AI Matching",         icon: Zap        },
  { key: "intake",    label: "Smart Intake",        icon: FormInput  },
  { key: "graph",     label: "Relationship Graph",  icon: Share2     },
  { key: "flywheel",  label: "Intelligence Flywheel", icon: RefreshCw },
];

const SCREEN_META = {
  dashboard: { title: "Dashboard",             sub: "Programme health and AI signals at a glance." },
  pipeline:  { title: "Programme Pipeline",    sub: "All companies in CREST 2026 MY · status, assignments, bulk actions." },
  matching:  { title: "AI Matching",           sub: "Run the match engine and approve mentor recommendations." },
  intake:    { title: "Smart Intake",          sub: "Paste a pitch — Gemini extracts the structured profile." },
  graph:     { title: "Relationship Graph",    sub: "Companies, mentors, and the programme as a first-class graph." },
  flywheel:  { title: "Intelligence Flywheel", sub: "Compounding outcomes — every cohort makes NEXUS smarter." },
};

const AVATAR_PALETTE = ["#185FA5","#1D9E75","#BA7517","#5C3A99","#1B7C8C","#9B3275","#4F7A1F","#B43938","#3A6FB0","#2F8B72"];
const Avatar = ({ name, size = 32 }) => {
  const initials = name.split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase();
  const hue = name.charCodeAt(0) % AVATAR_PALETTE.length;
  const fontSize = Math.max(11, Math.round(size * 0.38));
  return (
    <div className="inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0"
         style={{ width: size, height: size, background: AVATAR_PALETTE[hue], fontSize }}>{initials}</div>
  );
};

const NexusLogo = ({ size = 28 }) => (
  <div className="flex items-center gap-2.5">
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#185FA5" />
      <circle cx="10" cy="11" r="2.4" fill="#fff" />
      <circle cx="22" cy="11" r="2.4" fill="#fff" />
      <circle cx="16" cy="22" r="2.4" fill="#fff" />
      <path d="M10 11 L16 22 M22 11 L16 22 M10 11 L22 11" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity="0.85" />
    </svg>
    <div className="leading-tight">
      <div className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--nx-text)" }}>NEXUS</div>
      <div className="text-[10.5px] mono" style={{ color: "var(--nx-text-3)", marginTop: -2 }}>cradle.intel</div>
    </div>
  </div>
);

function MobileBottomNav({ active, onNavigate }) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t flex"
         style={{ background: "var(--nx-sidebar)", borderColor: "var(--nx-border)" }}>
      {NAV_ITEMS.map(item => {
        const isActive = active === item.key;
        const IconC = item.icon;
        const shortLabel = item.label.split(" ")[0];
        return (
          <button key={item.key} onClick={() => onNavigate(item.key)}
                  className="flex-1 flex flex-col items-center gap-0.5 py-2 px-1 transition"
                  style={{ color: isActive ? "#185FA5" : "var(--nx-text-3)" }}>
            <IconC size={18} />
            <span className="text-[9px] font-medium leading-tight">{shortLabel}</span>
          </button>
        );
      })}
    </nav>
  );
}

function Sidebar({ active, onNavigate }) {
  return (
    <aside className="hidden md:flex w-[220px] shrink-0 border-r flex-col"
           style={{ background: "var(--nx-sidebar)", borderColor: "var(--nx-border)" }}>
      <div className="px-5 pt-5 pb-6">
        <NexusLogo />
      </div>

      <nav className="px-3 flex flex-col gap-0.5">
        <div className="text-[10.5px] uppercase tracking-wider font-medium px-2 mb-1" style={{ color: "var(--nx-text-3)" }}>Workspace</div>
        {NAV_ITEMS.map(item => {
          const isActive = active === item.key;
          const IconC = item.icon;
          return (
            <button key={item.key} onClick={() => onNavigate(item.key)}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13.5px] font-medium transition text-left"
                    style={{
                      background: isActive ? "#185FA5" : "transparent",
                      color: isActive ? "#fff" : "var(--nx-text-2)",
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--nx-hover)"; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
              <IconC size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto px-4 py-4 border-t" style={{ borderColor: "var(--nx-border-soft)" }}>
        <div className="rounded-lg p-3" style={{ background: "var(--nx-card-subtle)", border: "1px solid var(--nx-border-soft)" }}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#1D9E75" }} />
            <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--nx-text-2)" }}>Backend</span>
          </div>
          <div className="text-[12px] mono" style={{ color: "var(--nx-text)" }}>localhost:8000</div>
          <div className="text-[10.5px] mt-0.5" style={{ color: "var(--nx-text-3)" }}>Gemini · XGBoost · ready</div>
        </div>
        <div className="text-[10.5px] mt-3 px-1" style={{ color: "var(--nx-text-3)" }}>
          Hackathon MVP · v0.3.1
        </div>
      </div>
    </aside>
  );
}

function TopBar({ screenKey, dark, onToggleDark, onAvatarClick }) {
  const meta = SCREEN_META[screenKey];
  return (
    <div className="sticky top-0 z-20 bg-[var(--nx-surface)] border-b" style={{ borderColor: "var(--nx-border)" }}>
      {/* Mobile header */}
      <div className="flex md:hidden items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--nx-border-soft)" }}>
        <NexusLogo size={24} />
        <div className="flex-1" />
        <button className="relative" style={{ color: "var(--nx-text-2)" }}>
          <Bell size={16} />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full" style={{ background: "#E24B4A" }} />
        </button>
        <button onClick={onToggleDark}
                className="p-1.5 rounded-md transition"
                style={{ color: "var(--nx-text-2)", background: "transparent" }}
                title={dark ? "Switch to light mode" : "Switch to dark mode"}>
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button onClick={onAvatarClick} className="rounded-full transition opacity-90 hover:opacity-100" title="Switch to Applicant Portal">
          <Avatar name="Keat Hong" size={28} />
        </button>
      </div>

      {/* Desktop header */}
      <div className="hidden md:flex px-8 py-3 items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-wider font-medium" style={{ color: "var(--nx-text-3)" }}>Programme</span>
          <button className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-[13px] font-semibold"
                  style={{ borderColor: "var(--nx-border)", background: "var(--nx-card)", color: "var(--nx-text)" }}>
            CREST 2026 MY <ChevronDown size={14} style={{ color: "var(--nx-text-3)" }}/>
          </button>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: "var(--nx-success-50)", color: "#1D9E75" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#1D9E75" }} /> Active
          </span>
          <span className="text-[12px] mono" style={{ color: "var(--nx-text-3)" }}>P_05 · Mar–Sep 2026</span>
        </div>

        <div className="flex-1" />

        <button className="text-[12.5px] flex items-center gap-1.5 hover:text-[var(--nx-text)]" style={{ color: "var(--nx-text-2)" }}>
          <Search size={14}/> Search
          <span className="mono text-[10px] px-1 py-0.5 rounded" style={{ background: "var(--nx-kbd)" }}>⌘K</span>
        </button>
        <button className="relative" style={{ color: "var(--nx-text-2)" }}>
          <Bell size={16} />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full" style={{ background: "#E24B4A" }} />
        </button>
        <button onClick={onToggleDark}
                className="p-1.5 rounded-md transition"
                style={{ color: "var(--nx-text-2)", background: "transparent" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--nx-hover)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                title={dark ? "Switch to light mode" : "Switch to dark mode"}>
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button onClick={onAvatarClick}
                className="flex items-center gap-2 pl-3 ml-1 border-l rounded-lg px-2 py-1 transition"
                style={{ borderColor: "var(--nx-border)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--nx-hover)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                title="Switch to Applicant Portal">
          <Avatar name="Keat Hong" size={28} />
          <div className="leading-tight">
            <div className="text-[12.5px] font-semibold">Keat Hong</div>
            <div className="text-[11px]" style={{ color: "var(--nx-text-3)" }}>Programme Manager</div>
          </div>
        </button>
      </div>

      {/* Screen title */}
      <div className="px-4 md:px-8 pt-4 pb-4 md:pt-5 md:pb-5">
        <h1 className="text-[20px] md:text-[26px] font-semibold tracking-tight leading-tight">{meta.title}</h1>
        <p className="text-[13px] md:text-[14px] mt-1 hidden sm:block" style={{ color: "var(--nx-text-2)" }}>{meta.sub}</p>
      </div>
    </div>
  );
}

function ApplicantPortal({ dark, onToggleDark, onExitPortal, addPendingApplication }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--nx-surface)" }}>
      {/* Portal header */}
      <header className="border-b" style={{ background: "var(--nx-card)", borderColor: "var(--nx-border)" }}>
        <div className="max-w-2xl mx-auto px-5 sm:px-8 py-4 flex items-center gap-4">
          <NexusLogo size={26} />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--nx-text-3)" }}>
              Application Portal
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: "var(--nx-success-50)", color: "#1D9E75" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#1D9E75" }} /> Accepting applications
          </span>
          <button onClick={onToggleDark}
                  className="p-1.5 rounded-md"
                  style={{ color: "var(--nx-text-2)" }}
                  title={dark ? "Switch to light mode" : "Switch to dark mode"}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {/* Hero band */}
      <div className="border-b" style={{ background: "var(--nx-primary)", borderColor: "transparent" }}>
        <div className="max-w-2xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
          <div className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
            CREST 2026 Malaysia
          </div>
          <h1 className="text-[26px] sm:text-[32px] font-semibold tracking-tight text-white leading-tight">
            Apply to join the programme
          </h1>
          <p className="text-[14px] mt-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
            Cradle's CREST accelerator connects high-potential startups with seasoned mentors.
            Fill in the form below and our AI-powered intake system will process your application.
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-[12px]" style={{ color: "rgba(255,255,255,0.65)" }}>
            <span>📅 Mar – Sep 2026</span>
            <span>📍 Kuala Lumpur, Malaysia</span>
            <span>🏢 Up to 30 startups</span>
          </div>
        </div>
      </div>

      {/* Form area */}
      <main className="flex-1 px-5 sm:px-8 py-8">
        <div className="max-w-2xl mx-auto">
          <ApplicantScreen addPendingApplication={addPendingApplication} />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-5 px-5 text-center" style={{ borderColor: "var(--nx-border-soft)" }}>
        <button onClick={onExitPortal}
                className="text-[11.5px] hover:underline transition"
                style={{ color: "var(--nx-text-3)" }}>
          Programme staff? Access the manager view →
        </button>
      </footer>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState(() => window.location.hash.replace("#/", "") || "dashboard");
  const [navParams, setNavParams] = useState(null);
  const [role, setRole] = useState("pm");
  const [pendingApplications, setPendingApplications] = useState([]);
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem("nx-dark");
    if (stored !== null) return stored === "true";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("nx-dark", dark);
  }, [dark]);

  const [companies, setCompanies] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [mentors, setMentors] = useState(null);
  const [cohortSize, setCohortSize] = useState(null);
  const [totalCompanies, setTotalCompanies] = useState(null);
  const [outcomes, setOutcomes] = useState({});
  const [programmeClosed, setProgrammeClosed] = useState(false);
  const [reactivatedMentors, setReactivatedMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setLoadError(null);
    try {
      const [compData, mentorData] = await Promise.all([fetchCompanies({ programme_id: PROGRAMME_ID }), fetchMentors()]);
      const compList = compData.companies;
      const mentorList = mentorData.mentors;
      setCompanies(compList);
      if (compData.cohort_size) setCohortSize(compData.cohort_size);
      if (compData.total != null) setTotalCompanies(compData.total);
      setMentors(mentorList);
      const mentorsByName = {};
      mentorList.forEach(m => { mentorsByName[m.name] = m.id; });
      const initAssignments = {};
      compList.forEach(c => {
        if (c._assigned_mentor_name) {
          const mid = mentorsByName[c._assigned_mentor_name];
          if (mid) initAssignments[c.id] = mid;
        }
      });
      setAssignments(initAssignments);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const ecosystem = { companies, assignments, outcomes, programmeClosed, reactivatedMentors, mentors, cohortSize, totalCompanies };

  useEffect(() => {
    const onHash = () => {
      const k = window.location.hash.replace("#/", "") || "dashboard";
      if (SCREEN_META[k]) setRoute(k);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = (key, params = null) => {
    setNavParams(params);
    window.location.hash = "#/" + key;
    setRoute(key);
  };

  const addCompany = (c) => {
    setCompanies(prev => prev.find(x => x.id === c.id) ? prev : [c, ...prev]);
  };

  const addAssignment = (companyId, mentorId, newStatus) => {
    setAssignments(prev => ({ ...prev, [companyId]: mentorId }));
    if (newStatus) {
      setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, status: newStatus } : c));
    }
    assignMentor(companyId, mentorId).catch(err => console.warn("Assign API:", err.message));
  };

  const closeProgramme = (outcomeMap) => {
    setOutcomes(outcomeMap);
    setProgrammeClosed(true);
    setCompanies(prev => prev.map(c => {
      const o = outcomeMap[c.id];
      if (!o) return c;
      return { ...c, status: o.outcome === "graduated" ? "Graduated" : c.status };
    }));
  };

  const activateReuseMentors = (mentorIds) => {
    setReactivatedMentors(prev => Array.from(new Set([...prev, ...mentorIds])));
  };

  const addPendingApplication = (app) => setPendingApplications(prev => [...prev, app]);
  const clearPendingApplications = () => setPendingApplications([]);

  const silentRefresh = useCallback(() => loadData({ silent: true }), [loadData]);
  const sharedProps = { ecosystem, addCompany, addAssignment, closeProgramme, activateReuseMentors, navigate, preselect: navParams, refreshData: silentRefresh, pendingApplications, clearPendingApplications };

  const renderScreen = () => {
    switch (route) {
      case "dashboard": return <DashboardScreen {...sharedProps} />;
      case "pipeline":  return <PipelineScreen {...sharedProps} />;
      case "matching":  return <MatchingScreen {...sharedProps} />;
      case "intake":    return <IntakeScreen {...sharedProps} />;
      case "graph":     return <GraphScreen {...sharedProps} />;
      case "flywheel":  return <FlywheelScreen {...sharedProps} />;
      default:          return <DashboardScreen {...sharedProps} />;
    }
  };

  const isPM = role === "pm";

  return (
    <ToastProvider>
      {/* Applicant portal — always mounted to preserve form state */}
      <div className={isPM ? "hidden" : ""}>
        <ApplicantPortal
          dark={dark}
          onToggleDark={() => setDark(d => !d)}
          onExitPortal={() => setRole("pm")}
          addPendingApplication={addPendingApplication}
        />
      </div>

      {/* PM layout — always mounted to preserve screen state (e.g. IntakeScreen parse results) */}
      <div className={isPM ? "" : "hidden"}>
        <div className="flex min-h-screen">
          <Sidebar active={route} onNavigate={navigate} />
          <main className="flex-1 min-w-0 flex flex-col">
            <TopBar
              screenKey={route}
              dark={dark}
              onToggleDark={() => setDark(d => !d)}
              onAvatarClick={() => setRole("applicant")}
            />
            <div className="px-4 md:px-8 pt-6 pb-24 md:pb-12 flex-1" style={{ background: "var(--nx-surface)" }}>
              {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                  <RefreshCw size={24} className="animate-spin" style={{ color: "var(--nx-text-3)" }} />
                  <span className="text-[13px]" style={{ color: "var(--nx-text-3)" }}>Loading data…</span>
                </div>
              ) : loadError ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                  <div className="text-[13px] font-medium" style={{ color: "var(--nx-text)" }}>Failed to load data</div>
                  <div className="text-[12px] mono" style={{ color: "var(--nx-text-3)" }}>{loadError}</div>
                  <button onClick={loadData}
                          className="mt-2 px-4 py-1.5 rounded-md text-[13px] font-medium"
                          style={{ background: "#185FA5", color: "#fff" }}>
                    Retry
                  </button>
                </div>
              ) : (
                <div key={route} className="nx-fade-in">
                  {renderScreen()}
                </div>
              )}
            </div>
          </main>
        </div>
        <MobileBottomNav active={route} onNavigate={navigate} />
      </div>
    </ToastProvider>
  );
}
