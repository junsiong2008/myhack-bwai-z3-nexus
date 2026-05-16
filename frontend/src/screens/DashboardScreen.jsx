import { useState, useEffect } from 'react';
import { KPICard } from '../components';
import { Building2, Users, TrendingUp, Clock } from '../icons';
import { SECTOR_DISTRIBUTION, STAGE_DISTRIBUTION } from '../data';
import { fetchStats } from '../api';

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
  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border" style={{ borderColor: "var(--nx-border)", background: "var(--nx-card-subtle)" }}>
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

const SectorDonut = ({ data }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 78, stroke = 22, cx = 110, cy = 110, C = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
      <svg width="180" height="180" viewBox="0 0 220 220" className="shrink-0">
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

const StageBars = ({ data }) => {
  const max = Math.max(...data.map(d => d.value));
  const W = 460, H = 220, barW = 56, gap = 30;
  const baseY = 180;
  const totalBarsW = data.length * barW + (data.length - 1) * gap;
  const startX = (W - totalBarsW) / 2;
  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
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

export default function DashboardScreen({ ecosystem, navigate }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats().then(setStats).catch(console.error);
  }, []);

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KPICard label="Companies" value={stats ? String(stats.total_companies) : String(ecosystem.companies.length)} sublabel="Active in ecosystem" Icon={Building2} />
        <KPICard label="Mentors" value={stats ? String(stats.total_mentors) : String(ecosystem.mentors.length)} sublabel={stats ? `${stats.reusable_mentors} reuse-eligible` : "Loading…"} Icon={Users} />
        <KPICard label="Match success rate" value={stats ? `${stats.match_success_rate}%` : "—"} sublabel={stats ? `${stats.successful_matches} of ${stats.total_historical_matches} pairings` : "Loading…"} Icon={TrendingUp} trend />
        <KPICard label="Ops hours saved" value={stats ? `~${stats.ops_hours_saved}h` : "—"} sublabel="This cohort alone" Icon={Clock}
          tooltip={`Estimated at 2.5 hrs per company: ~1.7 hrs reviewing 20 mentor profiles manually (5 min each) + 30 min email & calendar coordination + 20 min admin. Across ${stats ? stats.total_companies : "all"} companies processed.`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <ChartCard title="Sector breakdown" subtitle="Active companies across CREST 2026 MY">
          <SectorDonut data={stats
            ? Object.entries(stats.sector_distribution).slice(0, 6).map(([name, value], i) => ({
                name, value,
                color: ["#185FA5","#1D9E75","#3CAEC0","#BA7517","#7A4FB0","#9C9B96"][i % 6],
              }))
            : SECTOR_DISTRIBUTION} />
        </ChartCard>
        <ChartCard title="Stage distribution" subtitle="Funding maturity across the cohort">
          <StageBars data={stats
            ? Object.entries(stats.stage_distribution).map(([name, value]) => ({ name, value }))
            : STAGE_DISTRIBUTION} />
        </ChartCard>
      </div>

      <div className="nx-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-[16px] font-semibold tracking-tight">Model performance</h3>
            <p className="text-[12.5px] text-[var(--nx-text-2)] mt-0.5">XGBoost match classifier · last trained on {stats ? stats.data_points_captured : "—"} data points</p>
          </div>
          <span className="text-[11px] mono px-2 py-1 rounded" style={{ background: "var(--nx-success-50)", color: "#1D9E75" }}>● Live</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ModelStat label="ROC-AUC" value={stats ? stats.model_auc.toFixed(4) : "—"} color="#185FA5" />
          <ModelStat label="Precision" value={stats ? `${stats.model_precision}%` : "—"} color="#1D9E75" />
          <ModelStat label="Recall" value={stats ? `${stats.model_recall}%` : "—"} color="#1D9E75" />
          <ModelStat label="Data points" value={stats ? String(stats.data_points_captured) : "—"} color="#6B6A65" />
        </div>
        <div className="mt-5 pt-5 border-t" style={{ borderColor: "var(--nx-border-soft)" }}>
          <div className="text-[11px] uppercase tracking-wide font-medium text-[var(--nx-text-2)] mb-2">Top signals</div>
          <div className="flex flex-wrap gap-2">
            {stats
              ? stats.feature_importances.map(f => <Signal key={f.label} label={f.label} weight={f.weight} />)
              : <span className="text-[12px] text-[var(--nx-text-3)]">Loading…</span>}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MiniStat
          title="Mentor NPS (avg)"
          value={stats ? `${stats.avg_mentor_nps} ★` : "—"}
          badge="green"
          detail={`Across ${stats ? stats.total_historical_matches : "—"} prior pairings`}
        />
        <MiniStat
          title="Pending intakes"
          value={stats ? String(stats.pending_intakes) : "—"}
          badge="amber"
          detail="Companies at Applied or Screened stage"
        />
      </div>
    </div>
  );
}
