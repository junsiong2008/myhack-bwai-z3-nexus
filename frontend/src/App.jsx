import { useState, useEffect } from 'react';
import { ToastProvider } from './components';
import { LayoutGrid, Workflow, Zap, FormInput, Share2, RefreshCw, Search, Bell, ChevronDown, Moon, Sun } from './icons';
import DashboardScreen from './screens/DashboardScreen';
import IntakeScreen from './screens/IntakeScreen';
import MatchingScreen from './screens/MatchingScreen';
import PipelineScreen from './screens/PipelineScreen';
import GraphScreen from './screens/GraphScreen';
import FlywheelScreen from './screens/FlywheelScreen';
import { COMPANIES, DEFAULT_ASSIGNMENTS } from './data';

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

function Sidebar({ active, onNavigate }) {
  return (
    <aside className="w-[220px] shrink-0 border-r flex flex-col"
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

function TopBar({ screenKey, dark, onToggleDark }) {
  const meta = SCREEN_META[screenKey];
  return (
    <div className="sticky top-0 z-20 bg-[var(--nx-surface)] border-b" style={{ borderColor: "var(--nx-border)" }}>
      <div className="px-8 py-3 flex items-center gap-4">
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
        <div className="flex items-center gap-2 pl-3 ml-1 border-l" style={{ borderColor: "var(--nx-border)" }}>
          <Avatar name="Keat Hong" size={28} />
          <div className="leading-tight">
            <div className="text-[12.5px] font-semibold">Keat Hong</div>
            <div className="text-[11px]" style={{ color: "var(--nx-text-3)" }}>Programme Manager</div>
          </div>
        </div>
      </div>
      <div className="px-8 pt-5 pb-5">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight leading-tight">{meta.title}</h1>
            <p className="text-[14px] mt-1" style={{ color: "var(--nx-text-2)" }}>{meta.sub}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState(() => window.location.hash.replace("#/", "") || "dashboard");
  const [navParams, setNavParams] = useState(null);
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem("nx-dark");
    if (stored !== null) return stored === "true";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("nx-dark", dark);
  }, [dark]);

  const [companies, setCompanies] = useState(COMPANIES);
  const [assignments, setAssignments] = useState(DEFAULT_ASSIGNMENTS);
  const [outcomes, setOutcomes] = useState({});
  const [programmeClosed, setProgrammeClosed] = useState(false);
  const [reactivatedMentors, setReactivatedMentors] = useState([]);

  const ecosystem = { companies, assignments, outcomes, programmeClosed, reactivatedMentors };

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

  const sharedProps = { ecosystem, addCompany, addAssignment, closeProgramme, activateReuseMentors, navigate, preselect: navParams };

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

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <Sidebar active={route} onNavigate={navigate} />
        <main className="flex-1 min-w-0 flex flex-col">
          <TopBar screenKey={route} dark={dark} onToggleDark={() => setDark(d => !d)} />
          <div className="px-8 pb-12 flex-1" style={{ background: "var(--nx-surface)" }}>
            <div key={route} className="nx-fade-in">
              {renderScreen()}
            </div>
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
