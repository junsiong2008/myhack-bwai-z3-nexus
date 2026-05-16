// Intelligence Flywheel screen
const FlywheelScreen = () => {
  const data = [
    { name: "Cohort 1", year: "2023 MY", accuracy: 61 },
    { name: "Cohort 2", year: "2024 MY", accuracy: 71 },
    { name: "Cohort 3", year: "2025 MY", accuracy: 79 },
    { name: "Cohort 4", year: "2026 MY", accuracy: 87 },
  ];

  return (
    <div className="max-w-[1080px] mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 text-[11px] font-medium uppercase tracking-wide"
             style={{ background: "#EAF2FB", color: "#185FA5" }}>
          <RefreshCw size={12} /> Compounding intelligence
        </div>
        <h1 className="text-[28px] font-semibold tracking-tight">Every cohort makes NEXUS smarter</h1>
        <p className="text-[14px] text-[var(--nx-text-2)] mt-2 max-w-xl mx-auto">
          Match outcomes, mentor NPS, and graduation signals feed back into the model.
          Year-on-year, the recommendations get sharper without any new dataset purchase.
        </p>
      </div>

      <div className="nx-card p-8 mb-6">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h3 className="text-[16px] font-semibold tracking-tight">Model accuracy by cohort</h3>
            <p className="text-[12.5px] text-[var(--nx-text-2)] mt-0.5">Top-1 mentor recommendation precision, validated against post-cohort NPS ≥ 4</p>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wide text-[var(--nx-text-2)] font-medium">Delta vs Cohort 1</div>
            <div className="text-[24px] font-semibold tabular-nums" style={{ color: "#1D9E75" }}>+26 pts</div>
          </div>
        </div>
        <FlywheelChart data={data} />
      </div>

      {/* Comparison cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="nx-card p-6 relative overflow-hidden"
             style={{ background: "#FDF7F6", borderColor: "#F0D6D5" }}>
          <div className="text-[11px] uppercase tracking-wide font-semibold mb-3" style={{ color: "#B43938" }}>
            Today — without NEXUS
          </div>
          <ul className="space-y-3">
            {[
              "Cohort ends → data dumped",
              "Next cohort starts from zero",
              "PM tribal knowledge walks out the door",
              "Year 5 quality ≈ Year 1 quality",
            ].map((t, i) => (
              <li key={i} className="flex gap-2.5 text-[13.5px]" style={{ color: "#6B4A4A" }}>
                <X size={16} className="mt-0.5 shrink-0" style={{ color: "#B43938" }} />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="nx-card p-6 relative overflow-hidden"
             style={{ background: "#F4FBF8", borderColor: "#BFE3D2" }}>
          <div className="text-[11px] uppercase tracking-wide font-semibold mb-3" style={{ color: "#1D9E75" }}>
            With NEXUS
          </div>
          <ul className="space-y-3">
            {[
              "Cohort ends → outcomes captured as training data",
              "Next cohort starts smarter",
              "Institutional memory persists across PM rotation",
              "Year 5 quality > Year 4 > Year 3 > Year 1",
            ].map((t, i) => (
              <li key={i} className="flex gap-2.5 text-[13.5px]" style={{ color: "#1f4a3a" }}>
                <Check size={16} className="mt-0.5 shrink-0" style={{ color: "#1D9E75" }} />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Leadership reporting panel — Step 8 */}
      <div className="nx-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider font-medium text-[var(--nx-primary)] mb-1">Leadership reporting</div>
            <h3 className="text-[16px] font-semibold tracking-tight">CREST 2026 MY · attributable impact</h3>
            <p className="text-[12.5px] text-[var(--nx-text-2)] mt-0.5">
              First time Cradle can answer "are our programmes producing better outcomes than last year?" with hard numbers.
            </p>
          </div>
          <button className="nx-btn-outline text-[12px] flex items-center gap-1.5">
            Export for MoF <ArrowRight size={12}/>
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-5">
          <LeadStat label="Startups graduated" value="24" sub="of 30 in cohort · 80% completion" color="#1D9E75" />
          <LeadStat label="Match accuracy" value="87%" sub="↑ 8 pts vs Cohort 3" color="#185FA5" trend />
          <LeadStat label="Outcome data captured" value="100%" sub="30 / 30 edges labelled" color="#1D9E75" />
          <LeadStat label="Annual ops savings" value="MYR 102,880" sub="Across 4 programmes / year" color="#BA7517" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border p-4" style={{ borderColor: "#ECEAE3", background: "#FBFBFA" }}>
            <div className="text-[11px] uppercase tracking-wide font-medium text-[var(--nx-text-2)] mb-2">Year-on-year programme quality</div>
            <div className="space-y-2 text-[12.5px]">
              <YoYRow label="Mentor NPS (avg)"        prev="4.21" curr="4.62" />
              <YoYRow label="Match-to-engagement rate" prev="48%"  curr="82%" />
              <YoYRow label="Time-to-match (median)"   prev="6.2d" curr="0.4d" inverse />
              <YoYRow label="Mentor reuse rate"        prev="11%"  curr="78%" />
            </div>
          </div>
          <div className="rounded-lg border p-4" style={{ borderColor: "#ECEAE3", background: "#FBFBFA" }}>
            <div className="text-[11px] uppercase tracking-wide font-medium text-[var(--nx-text-2)] mb-2">What this enables for leadership</div>
            <ul className="space-y-2 text-[12.5px]" style={{ color: "#1f4a3a" }}>
              <li className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0" style={{ color: "#1D9E75" }}/>Defensible budget justification to Ministry of Finance with attributable outcomes</li>
              <li className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0" style={{ color: "#1D9E75" }}/>Compare programmes side-by-side using consistent NPS + graduation metrics</li>
              <li className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0" style={{ color: "#1D9E75" }}/>Identify which interventions correlate with successful exits</li>
              <li className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0" style={{ color: "#1D9E75" }}/>Quantify institutional knowledge that previously walked out with departing PMs</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Callout */}
      <div className="rounded-xl border-l-4 p-5 italic text-[15px] leading-relaxed"
           style={{ background: "#EAF2FB", borderLeftColor: "#185FA5", color: "#1A1A18", borderTop: "1px solid #cfdef0", borderRight: "1px solid #cfdef0", borderBottom: "1px solid #cfdef0" }}>
        "NEXUS turns every past programme into training data, so Cradle's next cohort runs itself."
      </div>
    </div>
  );
};

const LeadStat = ({ label, value, sub, color, trend }) => (
  <div className="rounded-lg border p-4" style={{ borderColor: "#ECEAE3", background: "#FBFBFA" }}>
    <div className="text-[11px] uppercase tracking-wide font-medium text-[var(--nx-text-2)] mb-1">{label}</div>
    <div className="flex items-baseline gap-1.5">
      <span className="text-[22px] font-semibold tabular-nums leading-none" style={{ color }}>{value}</span>
      {trend && <span className="text-[11px] font-semibold" style={{ color: "#1D9E75" }}>↑</span>}
    </div>
    <div className="text-[11px] text-[var(--nx-text-3)] mt-1.5">{sub}</div>
  </div>
);

const YoYRow = ({ label, prev, curr, inverse }) => {
  // Detect numeric improvement direction
  const num = (s) => parseFloat(String(s).replace(/[^0-9.\-]/g, "")) || 0;
  const improved = inverse ? num(curr) < num(prev) : num(curr) > num(prev);
  return (
    <div className="flex items-center gap-3">
      <span className="flex-1 text-[var(--nx-text)]">{label}</span>
      <span className="text-[var(--nx-text-3)] mono text-[11.5px] tabular-nums w-12 text-right">{prev}</span>
      <ArrowRight size={11} className="text-[var(--nx-text-3)]"/>
      <span className="mono text-[12px] tabular-nums w-12 text-right font-semibold"
            style={{ color: improved ? "#1D9E75" : "#E24B4A" }}>{curr}</span>
    </div>
  );
};

const FlywheelChart = ({ data }) => {
  const W = 880, H = 280;
  const padL = 60, padR = 40, padT = 30, padB = 60;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const yMin = 50, yMax = 100;
  const x = (i) => padL + (i / (data.length - 1)) * innerW;
  const y = (v) => padT + (1 - (v - yMin) / (yMax - yMin)) * innerH;

  const pathD = data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d.accuracy)}`).join(" ");
  const fillD = pathD + ` L ${x(data.length - 1)} ${padT + innerH} L ${x(0)} ${padT + innerH} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="flyGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#185FA5" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#185FA5" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* y gridlines */}
      {[50, 60, 70, 80, 90, 100].map((v, i) => (
        <g key={v}>
          <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke="#ECEAE3" />
          <text x={padL - 10} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#9C9B96">{v}%</text>
        </g>
      ))}
      {/* area + line */}
      <path d={fillD} fill="url(#flyGrad)">
        <animate attributeName="opacity" from="0" to="1" dur="0.9s" fill="freeze" />
      </path>
      <path d={pathD} fill="none" stroke="#185FA5" strokeWidth="2.5" strokeLinecap="round">
        <animate attributeName="stroke-dasharray" from="0 2000" to="2000 0" dur="1.4s" fill="freeze" />
      </path>
      {/* dots + labels */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.accuracy)} r="6" fill="#fff" stroke="#185FA5" strokeWidth="2.5" />
          <text x={x(i)} y={y(d.accuracy) - 16} textAnchor="middle" fontSize="13" fontWeight="600" fill="#1A1A18">{d.accuracy}%</text>
          <text x={x(i)} y={H - 30} textAnchor="middle" fontSize="12" fontWeight="500" fill="#1A1A18">{d.name}</text>
          <text x={x(i)} y={H - 14} textAnchor="middle" fontSize="11" fill="#9C9B96">{d.year}</text>
        </g>
      ))}
    </svg>
  );
};

window.FlywheelScreen = FlywheelScreen;
