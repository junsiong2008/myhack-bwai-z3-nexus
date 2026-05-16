// Dashboard screen
const DashboardScreen = ({ ecosystem, navigate }) => {
  const matched = Object.keys(ecosystem.assignments).length;
  const totalCompanies = ecosystem.companies.length;

  // At-risk companies (Step 5)
  const atRisk = React.useMemo(() => {
    return Object.entries(ecosystem.assignments).map(([cid, mid]) => {
      const c = ecosystem.companies.find(x => x.id === cid);
      if (!c) return null;
      const eng = computeEngagement(c, mid);
      if (!eng.atRisk) return null;
      const mentor = MENTORS.find(m => m.id === mid);
      return { company: c, mentor, eng };
    }).filter(Boolean);
  }, [ecosystem]);

  return (
    <div>
      {/* At-risk strip — Step 5 */}
      {atRisk.length > 0 && (
        <div className="nx-card mb-4 overflow-hidden"
             style={{ borderColor: "#F0BFBE" }}>
          <div className="flex items-center gap-3 px-5 py-3"
               style={{ background: "#FDF7F6", borderBottom: "1px solid #F0D6D5" }}>
            <div className="w-7 h-7 rounded-md flex items-center justify-center"
                 style={{ background: "#E24B4A", color: "#fff" }}>
              <AlertTriangle size={14} />
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-semibold leading-tight" style={{ color: "#8a2c2b" }}>
                {atRisk.length} {atRisk.length === 1 ? "company" : "companies"} at risk — no mentor sessions in 14+ days
              </div>
              <div className="text-[11.5px]" style={{ color: "#6B4A4A" }}>NEXUS detected engagement anomalies in CREST 2026 MY. Review and intervene.</div>
            </div>
            <button onClick={() => navigate("pipeline")} className="text-[12px] font-semibold flex items-center gap-1" style={{ color: "#B43938" }}>
              Open pipeline <ArrowRight size={12} />
            </button>
          </div>
          <div className="px-5 py-3 grid gap-2" style={{ background: "#fff" }}>
            {atRisk.slice(0, 3).map(({ company, mentor, eng }) => (
              <div key={company.id} className="flex items-center gap-3 text-[12.5px]">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#E24B4A" }} />
                <span className="font-semibold w-28 truncate">{company.name}</span>
                <SectorBadge sector={company.sector} />
                <span className="text-[var(--nx-text-3)]">paired with</span>
                {mentor && <span className="flex items-center gap-1.5"><Avatar name={mentor.name} size={20}/><span className="font-medium">{mentor.name}</span></span>}
                <span className="ml-auto text-[var(--nx-text-3)] mono">
                  {eng.sessions} sessions · {eng.lastSessionDays}d since last
                </span>
              </div>
            ))}
            {atRisk.length > 3 && (
              <button onClick={() => navigate("pipeline")} className="text-[11.5px] text-[var(--nx-primary)] font-medium text-left hover:underline">
                + {atRisk.length - 3} more — view in pipeline
              </button>
            )}
          </div>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard label="Companies" value="300" sublabel="Active in ecosystem" Icon={Building2} />
        <KPICard label="Mentors" value="80" sublabel="62 reuse-eligible" Icon={Users} />
        <KPICard label="Match success rate" value="64.2%" sublabel="from 38% (manual)" Icon={TrendingUp} trend />
        <KPICard label="Ops hours saved" value="~45h" sublabel="This cohort alone" Icon={Clock} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <ChartCard title="Sector breakdown" subtitle="Active companies across CREST 2026 MY">
          <SectorDonut data={SECTOR_DISTRIBUTION} />
        </ChartCard>
        <ChartCard title="Stage distribution" subtitle="Funding maturity across the cohort">
          <StageBars data={STAGE_DISTRIBUTION} />
        </ChartCard>
      </div>

      {/* Model performance */}
      <div className="nx-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-[16px] font-semibold tracking-tight">Model performance</h3>
            <p className="text-[12.5px] text-[var(--nx-text-2)] mt-0.5">XGBoost match classifier · last trained on 268 historical pairings</p>
          </div>
          <span className="text-[11px] mono px-2 py-1 rounded"
                style={{ background: "#E6F5EF", color: "#1D9E75" }}>● Live</span>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <ModelStat label="ROC-AUC" value="0.8722" color="#185FA5" />
          <ModelStat label="Precision" value="82%" color="#1D9E75" />
          <ModelStat label="Recall" value="77%" color="#1D9E75" />
          <ModelStat label="Training records" value="268" color="#6B6A65" />
        </div>

        <div className="mt-5 pt-5 border-t" style={{ borderColor: "#ECEAE3" }}>
          <div className="text-[11px] uppercase tracking-wide font-medium text-[var(--nx-text-2)] mb-2">Top signals</div>
          <div className="flex flex-wrap gap-2">
            <Signal label="domain alignment" weight={0.31} />
            <Signal label="stage maturity" weight={0.16} />
            <Signal label="NPS × domain interaction" weight={0.12} />
            <Signal label="geographic proximity" weight={0.08} />
            <Signal label="capacity utilisation" weight={0.05} />
          </div>
        </div>
      </div>

      {/* Footer summary */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <MiniStat title="Programme health" value="On track" badge="green" detail="14 of 18 milestones hit" />
        <MiniStat title="Mentor NPS (avg)" value="4.6 ★" badge="green" detail="Across 268 prior pairings" />
        <MiniStat title="Pending intakes" value="7 today" badge="amber" detail="3 marked High-priority by AI" />
      </div>
    </div>
  );
};

const ChartCard = ({ title, subtitle, children }) => (
  <div className="nx-card p-6">
    <div className="mb-5">
      <h3 className="text-[16px] font-semibold tracking-tight">{title}</h3>
      <p className="text-[12.5px] text-[var(--nx-text-2)] mt-0.5">{subtitle}</p>
    </div>
    {children}
  </div>
);

const ModelStat = ({ label, value, color }) => (
  <div>
    <div className="text-[11px] uppercase tracking-wide font-medium text-[var(--nx-text-2)] mb-1">{label}</div>
    <div className="text-[28px] font-semibold tracking-tight tabular-nums leading-none" style={{ color }}>{value}</div>
  </div>
);

const Signal = ({ label, weight }) => (
  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border" style={{ borderColor: "#E0DED8", background: "#FBFBFA" }}>
    <span className="text-[12px] font-medium">{label}</span>
    <span className="text-[11px] mono text-[var(--nx-text-2)]">{weight.toFixed(2)}</span>
  </div>
);

const MiniStat = ({ title, value, badge, detail }) => {
  const badgeColors = {
    green: { bg: "#E6F5EF", fg: "#1D9E75" },
    amber: { bg: "#FBF1E1", fg: "#BA7517" },
    red: { bg: "#FCEAEA", fg: "#E24B4A" },
  };
  const b = badgeColors[badge] || badgeColors.green;
  return (
    <div className="nx-card p-4 flex items-center gap-3">
      <div className="w-2 h-12 rounded-full" style={{ background: b.fg }} />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] uppercase tracking-wide font-medium text-[var(--nx-text-2)]">{title}</div>
        <div className="text-[18px] font-semibold tracking-tight">{value}</div>
        <div className="text-[11.5px] text-[var(--nx-text-3)]">{detail}</div>
      </div>
    </div>
  );
};

// ───── Donut chart (SVG) ─────
const SectorDonut = ({ data }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 78, stroke = 22, cx = 110, cy = 110, C = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-6">
      <svg width="220" height="220" viewBox="0 0 220 220">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F3F1EC" strokeWidth={stroke} />
        {data.map((d, i) => {
          const frac = d.value / total;
          const dash = frac * C;
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                    stroke={d.color} strokeWidth={stroke}
                    strokeDasharray={`${dash} ${C - dash}`}
                    strokeDashoffset={-offset}
                    transform={`rotate(-90 ${cx} ${cy})`}
                    style={{ transition: "stroke-dasharray .8s ease" }} />
          );
          offset += dash;
          return el;
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="11" fill="#9C9B96" letterSpacing="0.5">SECTORS</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize="24" fontWeight="600" fill="#1A1A18">{data.length}</text>
      </svg>
      <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-2 text-[13px]">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
            <span className="flex-1 text-[var(--nx-text)] font-medium">{d.name}</span>
            <span className="tabular-nums text-[var(--nx-text-2)]">{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ───── Bar chart (SVG) ─────
const StageBars = ({ data }) => {
  const max = Math.max(...data.map(d => d.value));
  const W = 460, H = 220, barW = 56, gap = 30;
  const baseY = 180;
  const totalBarsW = data.length * barW + (data.length - 1) * gap;
  const startX = (W - totalBarsW) / 2;
  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {/* gridlines */}
        {[0.25, 0.5, 0.75, 1].map((p, i) => {
          const y = baseY - 140 * p;
          return <line key={i} x1="30" y1={y} x2={W - 20} y2={y} stroke="#ECEAE3" strokeWidth="1" />;
        })}
        {data.map((d, i) => {
          const h = (d.value / max) * 140;
          const x = startX + i * (barW + gap);
          const y = baseY - h;
          return (
            <g key={d.name}>
              <rect x={x} y={y} width={barW} height={h} rx="4" fill="#185FA5">
                <animate attributeName="height" from="0" to={h} dur=".7s" fill="freeze" />
                <animate attributeName="y" from={baseY} to={y} dur=".7s" fill="freeze" />
              </rect>
              <text x={x + barW / 2} y={y - 8} textAnchor="middle" fontSize="13" fontWeight="600" fill="#1A1A18">{d.value}</text>
              <text x={x + barW / 2} y={baseY + 18} textAnchor="middle" fontSize="12" fill="#6B6A65">{d.name}</text>
            </g>
          );
        })}
        <line x1="30" y1={baseY} x2={W - 20} y2={baseY} stroke="#E0DED8" strokeWidth="1" />
      </svg>
      <div className="text-[11px] text-[var(--nx-text-3)] text-center mt-1">Companies per stage</div>
    </div>
  );
};

window.DashboardScreen = DashboardScreen;
