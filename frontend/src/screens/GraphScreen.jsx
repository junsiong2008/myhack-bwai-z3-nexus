import { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Circle } from '../icons';
import { fetchGraph, PROGRAMME_ID } from '../api';

const Legend = ({ dot, rect, line, label }) => (
  <div className="flex items-center gap-2 text-[12px] text-[var(--nx-text-2)]">
    {dot && <span className="w-3 h-3 rounded-full" style={{ background: dot }} />}
    {rect && <span className="w-4 h-2.5 rounded" style={{ background: rect }} />}
    {line && <span className="w-6 h-0.5" style={{ background: line }} />}
    <span>{label}</span>
  </div>
);

export default function GraphScreen() {
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ nodes: 0, edges: 0 });

  useEffect(() => {
    let stopSimulation = () => {};

    fetchGraph(PROGRAMME_ID, 20)
      .then(({ nodes: apiNodes, edges: apiEdges }) => {
        const cx = 540, cy = 320;

        const progNode = apiNodes.find(n => n.type === 'programme');
        const mentorNodes = apiNodes.filter(n => n.type === 'mentor');
        const companyNodes = apiNodes.filter(n => n.type === 'company');

        const simNodes = apiNodes.map(n => {
          const node = { ...n };
          if (n.type === 'programme') {
            node.fx = cx; node.fy = cy;
          } else if (n.type === 'mentor') {
            const idx = mentorNodes.indexOf(n);
            const angle = (idx / mentorNodes.length) * Math.PI * 2 - Math.PI / 2;
            node.x = cx + Math.cos(angle) * 190;
            node.y = cy + Math.sin(angle) * 190;
          } else {
            const matchEdge = apiEdges.find(e => e.source === n.id && e.type === 'matched');
            const mentor = mentorNodes.find(m => m.id === matchEdge?.target);
            const midx = mentorNodes.indexOf(mentor);
            const angle = mentor
              ? (midx / mentorNodes.length) * Math.PI * 2 - Math.PI / 2
              : Math.random() * Math.PI * 2;
            node.x = cx + Math.cos(angle) * 330 + (Math.random() - 0.5) * 40;
            node.y = cy + Math.sin(angle) * 330 + (Math.random() - 0.5) * 40;
          }
          return node;
        });

        const simLinks = [];
        mentorNodes.forEach(m => {
          if (progNode) simLinks.push({ source: progNode.id, target: m.id, kind: 'programme', score: 0.5 });
        });
        apiEdges.filter(e => e.type === 'matched').forEach(e => {
          simLinks.push({
            source: e.target,
            target: e.source,
            kind: 'approved',
            score: e.weight || 0.5,
            companyLabel: companyNodes.find(n => n.id === e.source)?.label || e.source,
            mentorLabel: mentorNodes.find(n => n.id === e.target)?.label || e.target,
          });
        });

        setStats({ nodes: simNodes.length, edges: simLinks.length });

        const simulation = d3.forceSimulation(simNodes)
          .force('link', d3.forceLink(simLinks).id(d => d.id)
            .distance(d => d.kind === 'programme' ? 200 : 130)
            .strength(d => d.kind === 'programme' ? 0.7 : 0.5))
          .force('charge', d3.forceManyBody().strength(d => d.type === 'mentor' ? -600 : -220))
          .force('center', d3.forceCenter(cx, cy).strength(0.04))
          .force('collide', d3.forceCollide().radius(d => {
            if (d.type === 'programme') return 100;
            if (d.type === 'mentor') return 50;
            return 36;
          }).strength(0.8));

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const defs = svg.append('defs');
        const grad = defs.append('radialGradient').attr('id', 'ringGrad')
          .attr('cx', '50%').attr('cy', '50%').attr('r', '50%');
        grad.append('stop').attr('offset', '0%').attr('stop-color', '#185FA5').attr('stop-opacity', 0.05);
        grad.append('stop').attr('offset', '100%').attr('stop-color', '#185FA5').attr('stop-opacity', 0);

        const zoom = d3.zoom()
          .scaleExtent([0.3, 3])
          .on('zoom', (event) => { root.attr('transform', event.transform); });
        svg.call(zoom).on('dblclick.zoom', null);

        const root = svg.append('g');

        root.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 280).attr('fill', 'url(#ringGrad)');
        root.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 190)
          .attr('fill', 'none').attr('stroke', '#ECEAE3').attr('stroke-dasharray', '3 5');

        const linkEls = root.append('g').selectAll('line').data(simLinks).join('line')
          .attr('stroke', d => d.kind === 'programme' ? '#D6D3CB' : d.score > 0.7 ? '#1D9E75' : '#9C9B96')
          .attr('stroke-width', d => d.kind === 'programme' ? 1.5 : 1 + d.score * 3.5)
          .attr('stroke-opacity', 0.65)
          .attr('stroke-linecap', 'round')
          .style('cursor', 'pointer')
          .on('mouseenter', function (event, d) {
            if (d.kind !== 'approved') return;
            d3.select(this).attr('stroke', '#185FA5').attr('stroke-opacity', 1);
            setHover({ kind: 'edge', edge: d });
          })
          .on('mouseleave', function (event, d) {
            d3.select(this)
              .attr('stroke', d.kind === 'programme' ? '#D6D3CB' : d.score > 0.7 ? '#1D9E75' : '#9C9B96')
              .attr('stroke-opacity', 0.65);
            setHover(null);
          });

        const nodeEls = root.append('g').selectAll('g').data(simNodes).join('g')
          .style('cursor', d => d.type === 'programme' ? 'default' : 'pointer')
          .on('mouseenter', (_, d) => { if (d.type !== 'programme') setHover({ kind: 'node', node: d }); })
          .on('mouseleave', () => setHover(null));

        // Programme node
        const progEl = nodeEls.filter(d => d.type === 'programme');
        progEl.append('rect').attr('width', 180).attr('height', 52).attr('rx', 10)
          .attr('fill', '#BA7517').attr('stroke', '#8E5610').attr('stroke-width', 1.5);
        progEl.append('text').attr('x', 90).attr('y', 31)
          .attr('text-anchor', 'middle').attr('fill', '#fff')
          .attr('font-size', 13).attr('font-weight', 600).attr('font-family', 'sans-serif')
          .text(d => d.label);

        // Mentor nodes
        const mentorNodeR = d => {
          const conn = apiEdges.filter(e => e.target === d.id && e.type === 'matched').length;
          return 20 + Math.min(8, conn * 2.5);
        };
        const mentorEl = nodeEls.filter(d => d.type === 'mentor');
        mentorEl.append('circle').attr('r', mentorNodeR)
          .attr('fill', '#1D9E75').attr('stroke', '#fff').attr('stroke-width', 2.5);
        mentorEl.append('text').attr('text-anchor', 'middle')
          .attr('fill', '#1A1A18').attr('font-size', 10.5).attr('font-weight', 600).attr('font-family', 'sans-serif')
          .attr('dy', d => mentorNodeR(d) + 13)
          .text(d => d.label.length > 15 ? d.label.slice(0, 13) + '…' : d.label);

        // Company nodes
        const companyEl = nodeEls.filter(d => d.type === 'company');
        companyEl.append('circle').attr('r', 13)
          .attr('fill', '#185FA5').attr('stroke', '#fff').attr('stroke-width', 2);
        companyEl.append('text').attr('text-anchor', 'middle')
          .attr('fill', '#1A1A18').attr('font-size', 10).attr('font-weight', 500).attr('font-family', 'sans-serif')
          .attr('dy', 26)
          .text(d => d.label.length > 14 ? d.label.slice(0, 12) + '…' : d.label);

        // Drag
        const drag = d3.drag()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            if (d.type !== 'programme') { d.fx = null; d.fy = null; }
          });

        nodeEls.filter(d => d.type !== 'programme').call(drag);

        simulation.on('tick', () => {
          linkEls
            .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x).attr('y2', d => d.target.y);

          nodeEls.attr('transform', d =>
            d.type === 'programme'
              ? `translate(${d.x - 90},${d.y - 26})`
              : `translate(${d.x},${d.y})`
          );
        });

        simulation.on('end', () => {
          const pad = 60;
          const vw = 1080, vh = 640;
          const xs = simNodes.map(d => d.x);
          const ys = simNodes.map(d => d.y);
          const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad;
          const y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
          const scale = Math.min(0.95, Math.min(vw / (x1 - x0), vh / (y1 - y0)));
          const tx = (vw - scale * (x0 + x1)) / 2;
          const ty = (vh - scale * (y0 + y1)) / 2;
          svg.transition().duration(600)
            .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
        });

        stopSimulation = () => simulation.stop();
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    return () => stopSimulation();
  }, []);

  return (
    <div>
      <div className="nx-card p-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-[16px] font-semibold tracking-tight">CREST 2026 MY · ecosystem graph</h3>
            <p className="text-[12.5px] text-[var(--nx-text-2)] mt-0.5">
              {loading ? 'Loading…' : `${stats.nodes} nodes · ${stats.edges} edges · weighted by match score`}
            </p>
          </div>
          <div className="text-[11px] mono px-2 py-1 rounded" style={{ background: "var(--nx-primary-50)", color: "#185FA5" }}>
            ● D3 Force-directed
          </div>
        </div>

        <div className="relative" style={{ height: 600 }}>
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
              <div className="w-8 h-8 rounded-full border-2 border-[#185FA5] border-t-transparent animate-spin mb-3" />
              <p className="text-[13px] text-[var(--nx-text-2)]">Loading ecosystem graph…</p>
            </div>
          )}
          <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 1080 640"
            preserveAspectRatio="xMidYMid meet" className="block" />

          {hover && (
            <div className="absolute top-3 right-3 nx-card p-3 max-w-xs shadow-md nx-fade-in"
              style={{ pointerEvents: 'none' }}>
              {hover.kind === 'edge' ? (
                <div>
                  <div className="text-[11px] uppercase tracking-wide font-medium text-[var(--nx-text-2)] mb-1.5">Match edge</div>
                  <div className="text-[13px] font-semibold">{hover.edge.companyLabel} ↔ {hover.edge.mentorLabel}</div>
                  <div className="text-[12px] text-[var(--nx-text-2)] mt-1">
                    Match score: <span className="font-semibold text-[var(--nx-text)]">{Math.round(hover.edge.score * 100)}%</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-[11px] uppercase tracking-wide font-medium text-[var(--nx-text-2)] mb-1.5">
                    {hover.node.type === 'mentor' ? 'Mentor' : 'Company'}
                  </div>
                  <div className="text-[13px] font-semibold">{hover.node.label}</div>
                  {hover.node.type === 'mentor' && (
                    <div className="text-[12px] text-[var(--nx-text-2)] mt-1">
                      Domain: {Array.isArray(hover.node.domain) ? hover.node.domain.join(', ') : hover.node.domain}
                    </div>
                  )}
                  {hover.node.type === 'company' && (
                    <>
                      <div className="text-[12px] text-[var(--nx-text-2)] mt-1">Sector: {hover.node.sector}</div>
                      <div className="text-[12px] text-[var(--nx-text-2)]">Stage: {hover.node.stage}</div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-2 pt-4 border-t flex flex-wrap items-center gap-5" style={{ borderColor: 'var(--nx-border-soft)' }}>
          <Legend dot="#185FA5" label="Company" />
          <Legend dot="#1D9E75" label="Mentor (size = matches)" />
          <Legend rect="#BA7517" label="Programme" />
          <Legend line="#1D9E75" label="Approved match (thickness = score)" />
          <Legend line="#D6D3CB" label="Programme membership" />
          <span className="ml-auto text-[11px] text-[var(--nx-text-3)] flex items-center gap-1">
            <Circle size={10} /> Scroll to zoom · drag canvas to pan · drag nodes to reposition
          </span>
        </div>
      </div>
    </div>
  );
}
