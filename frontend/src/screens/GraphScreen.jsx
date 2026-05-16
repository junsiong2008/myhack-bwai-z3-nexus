import { useState, useMemo } from 'react';
import { Circle } from '../icons';
import { MENTORS, fakeMatch } from '../data';

const Legend = ({ dot, rect, line, label }) => (
  <div className="flex items-center gap-2 text-[12px] text-[var(--nx-text-2)]">
    {dot && <span className="w-3 h-3 rounded-full" style={{ background: dot }} />}
    {rect && <span className="w-4 h-2.5 rounded" style={{ background: rect }} />}
    {line && <span className="w-6 h-0.5" style={{ background: line }} />}
    <span>{label}</span>
  </div>
);

export default function GraphScreen({ ecosystem }) {
  const [hover, setHover] = useState(null);

  const { nodes, edges } = useMemo(() => {
    const assignments = ecosystem.assignments;
    const mentorIds = Array.from(new Set(Object.values(assignments)));
    const mentorList = mentorIds.map(id => MENTORS.find(m => m.id === id)).filter(Boolean);
    const companyList = Object.keys(assignments).map(cid => ecosystem.companies.find(c => c.id === cid)).filter(Boolean);

    const cx = 540, cy = 320;
    const programmeNode = { id: "P_05", type: "programme", label: "CREST 2026 MY", x: cx, y: cy };
    const innerR = 180;

    const nodes = [programmeNode];
    const mentorPos = {};
    mentorList.forEach((m, i) => {
      const angle = (i / Math.max(1, mentorList.length)) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(angle) * innerR;
      const y = cy + Math.sin(angle) * innerR;
      mentorPos[m.id] = { x, y, angle };
      const connCount = Object.values(assignments).filter(v => v === m.id).length;
      nodes.push({ id: m.id, type: "mentor", label: m.name, x, y, connections: connCount, domain: m.domain, geo: m.geography });
    });

    const mentorChildCount = {};
    companyList.forEach(c => {
      const mid = assignments[c.id];
      mentorChildCount[mid] = (mentorChildCount[mid] || 0) + 1;
    });
    const mentorChildIdx = {};
    companyList.forEach(c => {
      const mid = assignments[c.id];
      const total = mentorChildCount[mid];
      const idx = (mentorChildIdx[mid] = (mentorChildIdx[mid] || 0) + 1) - 1;
      const mPos = mentorPos[mid];
      if (!mPos) return;
      const spread = Math.PI / 2.4;
      const baseAngle = mPos.angle;
      const offset = total === 1 ? 0 : (idx - (total - 1) / 2) * (spread / Math.max(1, total - 1));
      const a = baseAngle + offset;
      const r = 280 + (idx % 2) * 35;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      nodes.push({ id: c.id, type: "company", label: c.name, x, y, sector: c.sector, stage: c.stage, geo: c.geo, status: c.status });
    });

    const edges = [];
    mentorList.forEach(m => {
      edges.push({ from: "P_05", to: m.id, kind: "programme", score: 0.5 });
    });
    companyList.forEach(c => {
      const mid = assignments[c.id];
      const m = MENTORS.find(x => x.id === mid);
      const score = fakeMatch(c, 3).find(r => r.mentor_id === mid)?.score || 0.75;
      edges.push({ from: mid, to: c.id, kind: "approved", score, company: c.name, mentor: m ? m.name : mid, outcome: c.status });
    });

    return { nodes, edges };
  }, [ecosystem]);

  const findNode = (id) => nodes.find(n => n.id === id);

  return (
    <div>
      <div className="nx-card p-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-[16px] font-semibold tracking-tight">CREST 2026 MY · ecosystem graph</h3>
            <p className="text-[12.5px] text-[var(--nx-text-2)] mt-0.5">{nodes.length - 1} nodes · {edges.length} edges · weighted by match score</p>
          </div>
          <div className="text-[11px] mono px-2 py-1 rounded" style={{ background: "var(--nx-primary-50)", color: "#185FA5" }}>● Force-directed</div>
        </div>

        <div className="relative" style={{ height: 600 }}>
          <svg width="100%" height="100%" viewBox="0 0 1080 640" preserveAspectRatio="xMidYMid meet" className="block">
            <defs>
              <radialGradient id="ringGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#185FA5" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#185FA5" stopOpacity="0" />
              </radialGradient>
            </defs>

            <circle cx="540" cy="320" r="260" fill="url(#ringGrad)" />
            <circle cx="540" cy="320" r="180" fill="none" stroke="#ECEAE3" strokeDasharray="3 5" />

            {edges.map((e, i) => {
              const a = findNode(e.from), b = findNode(e.to);
              if (!a || !b) return null;
              const sw = e.kind === "programme" ? 1.5 : 1 + e.score * 4;
              const color = e.kind === "programme" ? "#D6D3CB" : (e.score > 0.7 ? "#1D9E75" : "#9C9B96");
              const isHover = hover && hover.kind === "edge" && hover.idx === i;
              return (
                <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      stroke={isHover ? "#185FA5" : color}
                      strokeWidth={isHover ? sw + 1.5 : sw}
                      strokeOpacity={isHover ? 1 : 0.7}
                      onMouseEnter={() => setHover({ kind: "edge", idx: i, edge: e })}
                      onMouseLeave={() => setHover(null)}
                      style={{ cursor: "pointer", transition: "stroke-width .15s" }} />
              );
            })}

            {nodes.map((n) => {
              if (n.type === "programme") {
                return (
                  <g key={n.id}>
                    <rect x={n.x - 90} y={n.y - 26} width="180" height="52" rx="10"
                          fill="#BA7517" stroke="#8E5610" strokeWidth="1" />
                    <text x={n.x} y={n.y + 5} textAnchor="middle" fill="#fff" fontSize="14" fontWeight="600">{n.label}</text>
                  </g>
                );
              }
              const size = n.type === "mentor" ? 22 + Math.min(8, n.connections * 2) : 16;
              const fill = n.type === "mentor" ? "#1D9E75" : "#185FA5";
              const labelTxt = n.label.length > 14 ? n.label.slice(0, 12) + "…" : n.label;
              return (
                <g key={n.id} onMouseEnter={() => setHover({ kind: "node", node: n })}
                   onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
                  <circle cx={n.x} cy={n.y} r={size + 4} fill="#fff" opacity={hover && hover.kind === "node" && hover.node.id === n.id ? 0.9 : 0} />
                  <circle cx={n.x} cy={n.y} r={size} fill={fill} stroke="#fff" strokeWidth="2" />
                  <text x={n.x} y={n.y + size + 14} textAnchor="middle"
                        fill="#1A1A18" fontSize="11" fontWeight={n.type === "mentor" ? 600 : 500}>{labelTxt}</text>
                </g>
              );
            })}
          </svg>

          {hover && (
            <div className="absolute top-3 right-3 nx-card p-3 max-w-xs shadow-md nx-fade-in"
                 style={{ pointerEvents: "none" }}>
              {hover.kind === "edge" ? (
                <div>
                  <div className="text-[11px] uppercase tracking-wide font-medium text-[var(--nx-text-2)] mb-1.5">Relationship edge</div>
                  <div className="text-[13px] font-semibold">{hover.edge.company} ↔ {hover.edge.mentor}</div>
                  <div className="text-[12px] text-[var(--nx-text-2)] mt-1">Match score: <span className="font-semibold text-[var(--nx-text)]">{Math.round(hover.edge.score * 100)}%</span></div>
                  <div className="text-[12px] text-[var(--nx-text-2)]">Outcome: <span className="font-medium text-[var(--nx-text)]">{hover.edge.outcome}</span></div>
                </div>
              ) : (
                <div>
                  <div className="text-[11px] uppercase tracking-wide font-medium text-[var(--nx-text-2)] mb-1.5">
                    {hover.node.type === "mentor" ? "Mentor" : hover.node.type === "company" ? "Company" : "Programme"}
                  </div>
                  <div className="text-[13px] font-semibold">{hover.node.label}</div>
                  {hover.node.type === "mentor" && (
                    <>
                      <div className="text-[12px] text-[var(--nx-text-2)] mt-1">Domain: {hover.node.domain.join(", ")}</div>
                      <div className="text-[12px] text-[var(--nx-text-2)]">Geo: {hover.node.geo}</div>
                      <div className="text-[12px] text-[var(--nx-text-2)]">Active matches: <b className="text-[var(--nx-text)]">{hover.node.connections}</b></div>
                    </>
                  )}
                  {hover.node.type === "company" && (
                    <>
                      <div className="text-[12px] text-[var(--nx-text-2)] mt-1">Sector: {hover.node.sector} · {hover.node.stage}</div>
                      <div className="text-[12px] text-[var(--nx-text-2)]">Status: {hover.node.status}</div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-2 pt-4 border-t flex flex-wrap items-center gap-5" style={{ borderColor: "var(--nx-border-soft)" }}>
          <Legend dot="#185FA5" label="Company node" />
          <Legend dot="#1D9E75" label="Mentor node" />
          <Legend rect="#BA7517" label="Programme" />
          <Legend line="#1D9E75" label="Approved match (thickness = score)" />
          <Legend line="#D6D3CB" label="Programme membership" />
          <span className="ml-auto text-[11px] text-[var(--nx-text-3)] flex items-center gap-1">
            <Circle size={10}/> Hover any edge or node for detail
          </span>
        </div>
      </div>
    </div>
  );
}
