// NEXUS app shell — sidebar, topbar, routing
const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { key: "pipeline",  label: "Programme Pipeline", icon: Workflow },
  { key: "matching",  label: "AI Matching", icon: Zap },
  { key: "intake",    label: "Smart Intake", icon: FormInput },
  { key: "graph",     label: "Relationship Graph", icon: Share2 },
  { key: "flywheel",  label: "Intelligence Flywheel", icon: RefreshCw },
];

const SCREEN_META = {
  dashboard: { title: "Dashboard",            sub: "Programme health and AI signals at a glance." },
  pipeline:  { title: "Programme Pipeline",   sub: "All companies in CREST 2026 MY · status, assignments, bulk actions." },
  matching:  { title: "AI Matching",          sub: "Run the match engine and approve mentor recommendations." },
  intake:    { title: "Smart Intake",         sub: "Paste a pitch — Gemini extracts the structured profile." },
  graph:     { title: "Relationship Graph",   sub: "Companies, mentors, and the programme as a first-class graph." },
  flywheel:  { title: "Intelligence Flywheel",sub: "Compounding outcomes — every cohort makes NEXUS smarter." },
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
      <div className="text-[15px] font-semibold tracking-tight text-[var(--nx-text)]">NEXUS</div>
      <div className="text-[10.5px] mono text-[var(--nx-text-3)] -mt-0.5">cradle.intel</div>
    </div>
  </div>
);

const Sidebar = ({ active, onNavigate }) => (
  <aside className="w-[220px] shrink-0 bg-white border-r flex flex-col"
         style={{ borderColor: "#E0DED8" }}>
    <div className="px-5 pt-5 pb-6">
      <NexusLogo />
    </div>

    <nav className="px-3 flex flex-col gap-0.5">
      <div className="text-[10.5px] uppercase tracking-wider font-medium text-[var(--nx-text-3)] px-2 mb-1">Workspace</div>
      {NAV_ITEMS.map(item => {
        const isActive = active === item.key;
        const IconC = item.icon;
        return (
          <button key={item.key} onClick={() => onNavigate(item.key)}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13.5px] font-medium transition text-left"
                  style={{
                    background: isActive ? "#185FA5" : "transparent",
                    color: isActive ? "#fff" : "#6B6A65",
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#F3F1EC"; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
            <IconC size={16} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>

    <div className="mt-auto px-4 py-4 border-t" style={{ borderColor: "#ECEAE3" }}>
      <div className="rounded-lg p-3" style={{ background: "#FBFBFA", border: "1px solid #ECEAE3" }}>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#1D9E75" }} />
          <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--nx-text-2)]">Backend</span>
        </div>
        <div className="text-[12px] mono text-[var(--nx-text)]">localhost:8000</div>
        <div className="text-[10.5px] text-[var(--nx-text-3)] mt-0.5">Gemini · XGBoost · ready</div>
      </div>
      <div className="text-[10.5px] text-[var(--nx-text-3)] mt-3 px-1">
        Hackathon MVP · v0.3.1
      </div>
    </div>
  </aside>
);

const TopBar = ({ screenKey, onNavigate }) => {
  const meta = SCREEN_META[screenKey];
  return (
    <div className="sticky top-0 z-20 bg-[var(--nx-surface)] border-b" style={{ borderColor: "#E0DED8" }}>
      <div className="px-8 py-3 flex items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-wider font-medium text-[var(--nx-text-3)]">Programme</span>
          <button className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border bg-white hover:bg-[#FBFBFA] text-[13px] font-semibold"
                  style={{ borderColor: "#E0DED8" }}>
            CREST 2026 MY <ChevronDown size={14} className="text-[var(--nx-text-3)]"/>
          </button>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: "#E6F5EF", color: "#1D9E75" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#1D9E75" }} /> Active
          </span>
          <span className="text-[12px] text-[var(--nx-text-3)] mono">P_05 · Mar–Sep 2026</span>
        </div>

        <div className="flex-1" />

        <button className="text-[12.5px] text-[var(--nx-text-2)] flex items-center gap-1.5 hover:text-[var(--nx-text)]">
          <Search size={14}/> Search
          <span className="mono text-[10px] px-1 py-0.5 rounded" style={{ background: "#F0EFEA" }}>⌘K</span>
        </button>
        <button className="text-[var(--nx-text-2)] hover:text-[var(--nx-text)] relative">
          <Bell size={16} />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full" style={{ background: "#E24B4A" }} />
        </button>
        <div className="flex items-center gap-2 pl-3 ml-1 border-l" style={{ borderColor: "#E0DED8" }}>
          <Avatar name="Keat Hong" size={28} />
          <div className="leading-tight">
            <div className="text-[12.5px] font-semibold">Keat Hong</div>
            <div className="text-[11px] text-[var(--nx-text-3)]">Programme Manager</div>
          </div>
        </div>
      </div>
      {/* Page title block */}
      <div className="px-8 pt-5 pb-5">
        <PageHeader title={meta.title} subtitle={meta.sub} />
      </div>
    </div>
  );
};

const App = () => {
  const [route, setRoute] = React.useState(() => (window.location.hash.replace("#/", "") || "dashboard"));
  const [navParams, setNavParams] = React.useState(null);

  // Ecosystem state
  const [companies, setCompanies] = React.useState(COMPANIES);
  const [assignments, setAssignments] = React.useState(DEFAULT_ASSIGNMENTS);
  const [outcomes, setOutcomes] = React.useState({}); // { companyId: { outcome, mentor_nps, reuse_eligible } }
  const [programmeClosed, setProgrammeClosed] = React.useState(false);
  const [reactivatedMentors, setReactivatedMentors] = React.useState([]); // ids reused for next cohort

  const ecosystem = { companies, assignments, outcomes, programmeClosed, reactivatedMentors };

  React.useEffect(() => {
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
    // Update company statuses based on outcomes
    setCompanies(prev => prev.map(c => {
      const o = outcomeMap[c.id];
      if (!o) return c;
      return { ...c, status: o.outcome === "graduated" ? "Graduated" : c.status };
    }));
  };
  const activateReuseMentors = (mentorIds) => {
    setReactivatedMentors(prev => Array.from(new Set([...prev, ...mentorIds])));
  };

  const renderScreen = () => {
    const props = { ecosystem, addCompany, addAssignment, closeProgramme, activateReuseMentors, navigate, preselect: navParams };
    switch (route) {
      case "dashboard": return <DashboardScreen {...props} />;
      case "pipeline":  return <PipelineScreen {...props} />;
      case "matching":  return <MatchingScreen {...props} />;
      case "intake":    return <IntakeScreen {...props} />;
      case "graph":     return <GraphScreen {...props} />;
      case "flywheel":  return <FlywheelScreen {...props} />;
      default:          return <DashboardScreen {...props} />;
    }
  };

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <Sidebar active={route} onNavigate={navigate} />
        <main className="flex-1 min-w-0 flex flex-col">
          <TopBar screenKey={route} onNavigate={navigate} />
          <div className="px-8 pb-12 flex-1" data-screen-label={SCREEN_META[route].title}>
            <div key={route} className="nx-fade-in">
              {renderScreen()}
            </div>
          </div>
        </main>
      </div>
    </ToastProvider>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
