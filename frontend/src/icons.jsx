const Icon = ({ children, size = 18, className = "", strokeWidth = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
       className={className}>{children}</svg>
);

export const Sparkles = (p) => <Icon {...p}><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"/><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z"/><path d="M5 15l.6 1.6L7.2 17l-1.6.4L5 19l-.6-1.6L2.8 17l1.6-.4L5 15z"/></Icon>;
export const Zap = (p) => <Icon {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></Icon>;
export const Building2 = (p) => <Icon {...p}><path d="M6 22V4a2 2 0 012-2h8a2 2 0 012 2v18"/><path d="M6 12H4a2 2 0 00-2 2v8h4"/><path d="M18 9h2a2 2 0 012 2v11h-4"/><path d="M10 6h4M10 10h4M10 14h4M10 18h4"/></Icon>;
export const Users = (p) => <Icon {...p}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></Icon>;
export const TrendingUp = (p) => <Icon {...p}><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></Icon>;
export const Clock = (p) => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></Icon>;
export const LayoutGrid = (p) => <Icon {...p}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></Icon>;
export const Workflow = (p) => <Icon {...p}><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="9" y="15" width="6" height="6" rx="1"/><path d="M6 9v3a3 3 0 003 3"/><path d="M18 9v3a3 3 0 01-3 3"/></Icon>;
export const FormInput = (p) => <Icon {...p}><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 12h.01"/><path d="M17 12h.01"/><path d="M7 12h.01"/></Icon>;
export const Share2 = (p) => <Icon {...p}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></Icon>;
export const RefreshCw = (p) => <Icon {...p}><path d="M21 12a9 9 0 11-3-6.7L21 8"/><path d="M21 3v5h-5"/></Icon>;
export const Search = (p) => <Icon {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></Icon>;
export const Filter = (p) => <Icon {...p}><path d="M3 5h18l-7 9v6l-4-2v-4L3 5z"/></Icon>;
export const ChevronDown = (p) => <Icon {...p}><path d="M6 9l6 6 6-6"/></Icon>;
export const ChevronRight = (p) => <Icon {...p}><path d="M9 6l6 6-6 6"/></Icon>;
export const Check = (p) => <Icon {...p}><path d="M5 12l5 5L20 7"/></Icon>;
export const X = (p) => <Icon {...p}><path d="M18 6L6 18M6 6l12 12"/></Icon>;
export const AlertTriangle = (p) => <Icon {...p}><path d="M10.3 3.6L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.6a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/></Icon>;
export const Star = (p) => <Icon {...p}><path d="M12 2l3 7 7.5.6-5.7 5 1.8 7.4L12 18l-6.6 4 1.8-7.4L1.5 9.6 9 9l3-7z"/></Icon>;
export const Loader = (p) => <Icon {...p} className={"nx-spin " + (p.className || "")}><path d="M21 12a9 9 0 11-6.2-8.55"/></Icon>;
export const ArrowRight = (p) => <Icon {...p}><path d="M5 12h14M13 5l7 7-7 7"/></Icon>;
export const Bell = (p) => <Icon {...p}><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></Icon>;
export const Brain = (p) => <Icon {...p}><path d="M9.5 2A2.5 2.5 0 007 4.5v0A2.5 2.5 0 004.5 7v0A2.5 2.5 0 002 9.5v3A2.5 2.5 0 004.5 15v0A2.5 2.5 0 007 17.5v0A2.5 2.5 0 009.5 20h0A2.5 2.5 0 0012 17.5V4.5A2.5 2.5 0 009.5 2z"/><path d="M14.5 2A2.5 2.5 0 0117 4.5v0A2.5 2.5 0 0119.5 7v0A2.5 2.5 0 0122 9.5v3A2.5 2.5 0 0119.5 15v0A2.5 2.5 0 0117 17.5v0A2.5 2.5 0 0114.5 20h0A2.5 2.5 0 0112 17.5V4.5A2.5 2.5 0 0114.5 2z"/></Icon>;
export const Circle = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/></Icon>;
export const Plus = (p) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>;
export const MoreHorizontal = (p) => <Icon {...p}><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></Icon>;
export const Moon = (p) => <Icon {...p}><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></Icon>;
export const Sun = (p) => <Icon {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></Icon>;
