import { useState, useMemo, useEffect, useCallback } from "react";

const API_URL = "https://script.google.com/macros/s/AKfycbxbNc2pXZT8AsSgXNS9mjtaGda24l3kTl3Etvex1xmMV58_SX9DynXqXItYFwBYwaqryA/exec";

const PALETTE = ["#60a5fa","#f97316","#4ade80","#a78bfa","#f472b6","#34d399","#fbbf24","#94a3b8","#fb7185","#38bdf8","#c084fc","#fdba74","#86efac","#67e8f9","#fde68a","#d8b4fe"];
const MEMBER_COLOR_PALETTE = ["#60a5fa","#f472b6","#34d399","#fbbf24","#fb7185","#a78bfa"];
const DEFAULT_MEMBERS = [
  { name: "Matt",  color: "#60a5fa", role: "owner" },
  { name: "Alice", color: "#f472b6", role: "owner" },
];
const MAX_MEMBERS = 6;
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const truncate = (str, len = 45) => str && str.length > len ? str.slice(0, len) + "…" : str;

const DARK = {
  bg: "#0d0d0f",
  bgCard: "rgba(255,255,255,0.02)",
  bgInset: "rgba(193,127,62,0.04)",
  border: "rgba(193,127,62,0.12)",
  borderMid: "rgba(193,127,62,0.08)",
  textHi: "#ffffff",
  textMid: "#aaaaaa",
  textLo: "#555555",
  textDim: "#333333",
  accent: "#c17f3e",
  accentDim: "rgba(193,127,62,0.18)",
  sand: "#aaaaaa",
  sandDim: "#555555",
};

const LIGHT = {
  bg: "transparent",
  bgCard: "rgba(255,255,255,0.75)",
  bgInset: "rgba(193,127,62,0.05)",
  border: "rgba(193,127,62,0.18)",
  borderMid: "rgba(193,127,62,0.10)",
  textHi: "#111111",
  textMid: "#555555",
  textLo: "#999999",
  textDim: "#cccccc",
  accent: "#c17f3e",
  accentDim: "rgba(193,127,62,0.12)",
  sand: "#555555",
  sandDim: "#999999",
};

// Mutable module-level reference — updated on every render inside App()
// This allows helper components defined outside App() to read the current theme colors
let C = DARK;

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }

function getCategoryStatus(spent, budget, dayOfMonth, daysInMonth, type = "expense") {
  if (type === "investment") return "ok";
  if (type === "fixed") {
    if (spent > budget + 2) return "over";
    return "ok";
  }
  const progress = dayOfMonth / daysInMonth;
  if (Math.abs(spent - budget) <= 2) return "ok";
  if (spent > budget + 2) return "over";
  if (dayOfMonth < 15) return "ok";
  const proj = spent / Math.max(progress, 0.01);
  if (spent >= budget * 0.2 && proj >= budget + 2) return "risk";
  if (spent >= budget * 0.2 && proj >= budget * 0.85) return "warn";
  return "ok";
}

const STATUS = {
  ok:         { icon: "✓", color: "#4ade80" },
  warn:       { icon: "↑", color: "#eab308" },
  risk:       { icon: "↑", color: "#f97316" },
  over:       { icon: "!", color: "#ef4444" },
  investment: { icon: "↗", color: "#388bfd" },
};

function useIsDesktop() {
  const [v, setV] = useState(() => window.innerWidth >= 900);
  useEffect(() => {
    const h = () => setV(window.innerWidth >= 900);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return v;
}

function HeroDonut({ segments, totalSpend, totalBudget, size = 180, hoveredLabel, onHover }) {
  const r = 68, cx = 90, cy = 90, sw = 16;
  const circ = 2 * Math.PI * r;
  const total = Math.max(totalBudget, totalSpend, 1);
  const overBudget = totalSpend > totalBudget + 2;
  const fmt = n => `$${Math.round(n).toLocaleString("en-US")}`;
  let offset = 0;
  const arcs = segments.filter(s => s.value > 0).map(s => {
    const pct = s.value / total;
    const arc = { ...s, pct, offset };
    offset += pct;
    return arc;
  });
  const hovered = arcs.find(a => a.label === hoveredLabel);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg viewBox="0 0 180 180" style={{ width: size, height: size, transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.borderMid} strokeWidth={sw} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth={sw}
          strokeDasharray={`${Math.min(totalBudget / total, 1) * circ} ${circ}`} strokeLinecap="butt" />
        {arcs.map((arc, i) => {
          const isHov = hoveredLabel === arc.label;
          const isMuted = hoveredLabel && !isHov;
          return (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={arc.color}
              strokeWidth={isHov ? sw + 4 : sw}
              strokeDasharray={`${arc.pct * circ - 1.5} ${circ}`}
              strokeDashoffset={-arc.offset * circ}
              strokeLinecap="butt"
              opacity={isMuted ? 0.2 : 1}
              style={{ transition: "opacity 0.2s, stroke-width 0.2s, stroke-dasharray 0.7s cubic-bezier(.4,0,.2,1)", cursor: onHover ? "pointer" : "default" }}
              onMouseEnter={() => onHover && onHover(arc.label)}
              onMouseLeave={() => onHover && onHover(null)}
            />
          );
        })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, pointerEvents: "none" }}>
        {hovered ? (
          <>
            <div style={{ fontSize: 17, fontWeight: 800, color: hovered.color, fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{fmt(hovered.value)}</div>
            <div style={{ fontSize: 9, color: hovered.color, fontFamily: "'DM Mono', monospace", letterSpacing: 1, opacity: 0.8, maxWidth: 60, textAlign: "center", lineHeight: 1.2 }}>{hovered.label}</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 20, fontWeight: 800, color: overBudget ? "#f85149" : C.textHi, fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{fmt(totalSpend)}</div>
            <div style={{ fontSize: 9, color: C.textLo, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>spent</div>
          </>
        )}
      </div>
    </div>
  );
}

function LegendItem({ color, label, value, fmt, isHovered, isMuted, onMouseEnter, onMouseLeave }) {
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 7, opacity: isMuted ? 0.3 : 1, transition: "opacity 0.2s" }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0, transform: isHovered ? "scale(1.3)" : "scale(1)", transition: "transform 0.2s" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: isHovered ? C.textHi : C.textMid, fontWeight: isHovered ? 600 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", transition: "color 0.2s" }}>{label}</div>
        <div style={{ fontSize: 11, color: isHovered ? color : C.textLo, fontFamily: "'DM Mono', monospace", fontWeight: 700, transition: "color 0.2s" }}>{fmt(value)}</div>
      </div>
    </div>
  );
}

function MiniDonut({ saved, goal, color }) {
  const pct = goal > 0 ? Math.min(saved / goal, 1) : 0;
  const r = 36, cx = 45, cy = 45, sw = 9;
  const circ = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 90 90" style={{ width: 80, height: 80, transform: "rotate(-90deg)" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.borderMid} strokeWidth={sw} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s" }} />
    </svg>
  );
}

function CategoryBar({ spent, budget, color, dayOfMonth, daysInMonth, type = "expense" }) {
  const progress = dayOfMonth / daysInMonth;
  const pct = Math.min((spent / Math.max(budget, 0.01)) * 100, 100);
  const status = getCategoryStatus(spent, budget, dayOfMonth, daysInMonth, type);
  const projPct = Math.min((spent / Math.max(progress, 0.01) / Math.max(budget, 0.01)) * 100, 100);
  const isInvestment = type === "investment";
  const barColor = isInvestment ? "#388bfd"
    : status === "ok" ? color
    : status === "warn" ? "#eab308"
    : status === "risk" ? "#f97316"
    : "#ef4444";
  return (
    <div style={{ background: C.borderMid, borderRadius: 999, height: 4, position: "relative" }}>
      {status !== "over" && !isInvestment && <div style={{ position: "absolute", left: 0, top: 0, width: `${projPct}%`, height: "100%", background: barColor + "35", borderRadius: 999 }} />}
      <div style={{ position: "absolute", left: 0, top: 0, width: `${pct}%`, height: "100%", background: barColor, borderRadius: 999, transition: "width 0.5s" }} />
      {!isInvestment && <div style={{ position: "absolute", top: -4, bottom: -4, left: `${progress * 100}%`, width: 1.5, background: "rgba(255,255,255,0.35)", borderRadius: 1, transform: "translateX(-50%)" }} />}
    </div>
  );
}

function Modal({ onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 20, padding: 28, width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32, zIndex: 999 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes barPulse { 0%, 100% { transform: scaleY(0.4); opacity: 0.3; } 50% { transform: scaleY(1); opacity: 1; } }
        .load-bar { border-radius: 999px; animation: barPulse 1.2s ease-in-out infinite; transform-origin: bottom; }
      `}</style>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, animation: "fadeUp 0.5s ease both" }}>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, fontFamily: "'Sora',sans-serif" }}>
          <span style={{ color: C.textHi }}>family</span>
          <span style={{ color: C.textDim, fontWeight: 300, margin: "0 4px" }}>·</span>
          <span style={{ color: C.accent }}>budget</span>
        </div>
        <div style={{ fontSize: 11, color: C.textLo, fontFamily: "'Sora',sans-serif", fontWeight: 400, letterSpacing: 0.5 }}>your household, in focus</div>
      </div>
      <div style={{ display: "flex", gap: 5, alignItems: "flex-end", height: 20, animation: "fadeUp 0.5s 0.15s ease both", opacity: 0 }}>
        {[14, 22, 30, 22, 14, 20, 26].map((h, i) => (
          <div key={i} className="load-bar" style={{ width: 3, height: h, background: i === 2 || i === 6 ? C.accent : i === 1 || i === 3 ? C.textLo : C.border, animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
      <div style={{ fontSize: 11, color: C.textLo, fontFamily: "'Sora',sans-serif", letterSpacing: 0.3, animation: "fadeUp 0.5s 0.25s ease both", opacity: 0 }}>
        Pulling in your numbers...
      </div>
    </div>
  );
}

const FL = ({ children }) => (
  <div style={{ fontSize: 11, color: C.textMid, fontFamily: "'Sora',sans-serif", fontWeight: 500, marginBottom: 8 }}>{children}</div>
);

function NetWorthChart({ data, isDesktop }) {
  if (!data || data.length === 0) return null;
  const points = (() => {
    if (data.length <= 8) return data;
    const byMonth = {};
    data.forEach(d => { const month = d.date.slice(0, 7); byMonth[month] = d; });
    return Object.values(byMonth).sort((a, b) => a.date.localeCompare(b.date));
  })();
  const W = isDesktop ? 640 : 300;
  const H = 140;
  const PAD = { top: 16, right: 16, bottom: 32, left: 56 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const values = points.map(p => p.total);
  const minVal = Math.min(...values) * 0.95;
  const maxVal = Math.max(...values) * 1.05;
  const range = maxVal - minVal || 1;
  const x = i => PAD.left + (i / Math.max(points.length - 1, 1)) * chartW;
  const y = v => PAD.top + chartH - ((v - minVal) / range) * chartH;
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.total).toFixed(1)}`).join(' ');
  const areaD = `${pathD} L ${x(points.length - 1).toFixed(1)} ${(PAD.top + chartH).toFixed(1)} L ${PAD.left.toFixed(1)} ${(PAD.top + chartH).toFixed(1)} Z`;
  const ticks = [minVal, minVal + range / 2, maxVal];
  const fmtK = v => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${Math.round(v)}`;
  const xLabels = points.length > 1 ? [0, Math.floor((points.length - 1) / 2), points.length - 1].filter((v, i, a) => a.indexOf(v) === i) : [0];
  const fmtDate = str => { const d = new Date(str + 'T12:00:00'); return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }); };
  const latest = points[points.length - 1];
  const prev = points[points.length - 2];
  const change = prev ? latest.total - prev.total : null;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: C.textHi, fontFamily: "'DM Mono',monospace", letterSpacing: -1 }}>${Math.round(latest.total).toLocaleString('en-US')}</div>
        {change !== null && (
          <div style={{ fontSize: 13, color: change >= 0 ? '#3fb950' : '#f85149', fontFamily: "'DM Mono',monospace", fontWeight: 600 }}>
            {change >= 0 ? '+' : '−'}${Math.abs(Math.round(change)).toLocaleString('en-US')}
            <span style={{ fontSize: 10, color: C.textLo, marginLeft: 4 }}>vs last snapshot</span>
          </div>
        )}
      </div>
      <svg width={W} height={H} style={{ display: 'block', maxWidth: '100%' }}>
        <defs>
          <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.accent} stopOpacity="0.25" />
            <stop offset="100%" stopColor={C.accent} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={y(t)} x2={W - PAD.right} y2={y(t)} stroke={C.borderMid} strokeWidth="1" strokeDasharray="3,3" />
            <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" fontSize="9" fill={C.textLo} fontFamily="'DM Mono',monospace">{fmtK(t)}</text>
          </g>
        ))}
        <path d={areaD} fill="url(#nwGrad)" />
        <path d={pathD} fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (<circle key={i} cx={x(i)} cy={y(p.total)} r="3" fill={C.accent} stroke={C.bgCard} strokeWidth="1.5" />))}
        {xLabels.map(i => (<text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="9" fill={C.textLo} fontFamily="'DM Mono',monospace">{fmtDate(points[i].date)}</text>))}
      </svg>
    </div>
  );
}

function TrendsChart({ monthData, totalBudget, isDesktop, onSelectMonth, selectedMonth }) {
  const W = isDesktop ? 760 : 320;
  const H = 160;
  const PAD = { top: 16, right: 12, bottom: 28, left: 48 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const n = monthData.length;
  const barGap = 4;
  const barW = Math.max((chartW / n) - barGap, 8);
  const maxVal = Math.max(...monthData.map(m => m.spend), totalBudget) * 1.1 || 1;
  const barX = i => PAD.left + i * (chartW / n) + (chartW / n - barW) / 2;
  const barH = v => (v / maxVal) * chartH;
  const barY = v => PAD.top + chartH - barH(v);
  const budgetY = PAD.top + chartH - (totalBudget / maxVal) * chartH;
  const fmtK = v => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${Math.round(v)}`;
  const ticks = [0, maxVal * 0.5, maxVal].map(v => Math.round(v));
  return (
    <svg width={W} height={H} style={{ display: "block", maxWidth: "100%", overflow: "visible" }}>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={barY(t)} x2={W - PAD.right} y2={barY(t)} stroke={C.borderMid} strokeWidth="1" strokeDasharray="3,3" />
          <text x={PAD.left - 6} y={barY(t) + 4} textAnchor="end" fontSize="9" fill={C.textLo} fontFamily="'DM Mono',monospace">{fmtK(t)}</text>
        </g>
      ))}
      {totalBudget > 0 && (
        <g>
          <line x1={PAD.left} y1={budgetY} x2={W - PAD.right} y2={budgetY} stroke={C.textLo} strokeWidth="1" strokeDasharray="5,3" opacity="0.5" />
          <text x={W - PAD.right + 4} y={budgetY + 4} fontSize="8" fill={C.textLo} fontFamily="'DM Mono',monospace">budget</text>
        </g>
      )}
      {monthData.map((m, i) => {
        const over = m.spend > totalBudget + 2;
        const barColor = m.spend === 0 ? C.borderMid : over ? "#f85149" : "#3fb950";
        const isSelected = selectedMonth === m.key;
        return (
          <g key={i} onClick={() => onSelectMonth(isSelected ? null : m.key)} style={{ cursor: "pointer" }}>
            <rect x={barX(i)} y={m.spend > 0 ? barY(m.spend) : PAD.top + chartH - 2} width={barW} height={m.spend > 0 ? barH(m.spend) : 2} rx="3" fill={barColor} opacity={isSelected ? 1 : 0.75} style={{ transition: "opacity 0.15s" }} />
            {isSelected && <rect x={barX(i) - 2} y={PAD.top} width={barW + 4} height={chartH} rx="3" fill={barColor} opacity="0.08" />}
            <text x={barX(i) + barW / 2} y={H - 8} textAnchor="middle" fontSize="8" fill={isSelected ? C.textHi : C.textLo} fontFamily="'DM Mono',monospace">{m.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function App() {
  const isDesktop = useIsDesktop();
  const [allEntries, setAllEntries] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [catColors, setCatColors] = useState({});
  const [catTypes, setCatTypes] = useState({});
  const [members, setMembers] = useState(DEFAULT_MEMBERS);
  const [longTerm, setLongTerm] = useState([]);
  const [rawSections, setRawSections] = useState([]);
  const [netWorth, setNetWorth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState("dashboard");
  const [toast, setToast] = useState(null);
  const [nextId, setNextId] = useState(1);
  const [expandedSections, setExpandedSections] = useState({});
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [entriesOpen, setEntriesOpen] = useState(false);
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [expandedSummary, setExpandedSummary] = useState(false);
  const [expandedGoalsOutlook, setExpandedGoalsOutlook] = useState(false);
  const [settingsBudgetOpen, setSettingsBudgetOpen] = useState(true);
  const [settingsMembersOpen, setSettingsMembersOpen] = useState(true);
  const [nwOpen, setNwOpen] = useState(false);
  const [whatIfOpen, setWhatIfOpen] = useState({});
  const [selectedTrendsMonth, setSelectedTrendsMonth] = useState(null);
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [form, setForm] = useState({ member: "", category: "", amount: "", notes: "" });
  const [editEntry, setEditEntry] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editCat, setEditCat] = useState(null);
  const [catForm, setCatForm] = useState({ name: "", budget: "", color: PALETTE[0], type: "expense", section: "", newSection: "" });
  const [editLT, setEditLT] = useState(null);
  const [editMember, setEditMember] = useState(null);
  const [memberForm, setMemberForm] = useState({ name: "", color: MEMBER_COLOR_PALETTE[0], role: "contributor" });
  const [ltForm, setLtForm] = useState({ name: "", saved: "", goal: "", color: PALETTE[0], targetDate: "", startDate: "", type: "fixed", monthlyContribution: "" });
  const [theme, setTheme] = useState(() => localStorage.getItem('fb-theme') || 'dark');

  // Update the module-level C reference on every render
  C = theme === 'dark' ? DARK : LIGHT;

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('fb-theme', next);
  }

  const categories = useMemo(() => Object.keys(budgets), [budgets]);
  const memberNames  = useMemo(() => members.map(m => m.name), [members]);
  const memberColors = useMemo(() => Object.fromEntries(members.map(m => [m.name, m.color])), [members]);
  const showToast = useCallback((msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); }, []);

  const api = useCallback(async (params) => {
    const url = API_URL + "?" + new URLSearchParams(params).toString();
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await api({ action: "getAll" });
      const entries = (data.entries || []).filter(r => r[0]).map(r => ({ id: String(r[0]), date: String(r[1]), member: String(r[2]), category: String(r[3]), amount: parseFloat(r[4]), notes: String(r[5] || '') }));
      const bm = {}, cm = {}, tm = {};
      (data.budgets || []).forEach(r => { if (r[0]) { bm[String(r[0])] = parseFloat(r[1]); cm[String(r[0])] = String(r[2]); const rawType = String(r[3] || ""); tm[String(r[0])] = ["expense","fixed","investment"].includes(rawType) ? rawType : "expense"; } });
      const parseMonthStr = v => {
        if (!v) return '';
        const s = String(v).trim();
        if (/^\d{4}-\d{2}$/.test(s)) return s;
        if (/^\d{5}$/.test(s)) { const d = new Date(Math.round((parseFloat(s) - 25569) * 86400 * 1000)); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
        const m = s.match(/(\d{4})-(\d{2})/);
        return m ? `${m[1]}-${m[2]}` : '';
      };
      const lt = (data.longTerm || []).filter(r => r[0]).map(r => ({
        name: String(r[0]), saved: parseFloat(r[1]) || 0, goal: parseFloat(r[2]) || 0, color: String(r[3] || ''),
        targetDate: parseMonthStr(r[4]), startDate: parseMonthStr(r[5]),
        type: ['fixed','investment','debt'].includes(String(r[6]||'')) ? String(r[6]) : 'fixed',
        monthlyContribution: parseFloat(r[7]) || 0,
      }));
      const secs = (data.sections || []).filter(r => r[0] && r[1]).map(r => ({ section: String(r[0]), category: String(r[1]), order: parseInt(r[2]) || 0 }));
      const mems = (data.members || []).filter(r => r[0]).map(r => ({ name: String(r[0]), color: String(r[1] || MEMBER_COLOR_PALETTE[0]), role: String(r[2] || "contributor") }));
      const nw = (data.netWorth || []).filter(r => r[0]).map(r => ({ date: String(r[0]).slice(0, 10), total: parseFloat(r[1]) || 0, breakdown: (() => { try { return JSON.parse(String(r[2] || '[]')); } catch { return []; } })() })).sort((a, b) => a.date.localeCompare(b.date));
      setAllEntries(entries); setBudgets(bm); setCatColors(cm); setCatTypes(tm); setLongTerm(lt); setRawSections(secs); setNetWorth(nw);
      if (mems.length > 0) setMembers(mems);
      setNextId(entries.reduce((m, e) => Math.max(m, parseInt(e.id) || 0), 0) + 1);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [api]);

  useEffect(() => { loadData(); }, [loadData]);

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
  const isFutureMonth = viewYear > now.getFullYear() || (viewYear === now.getFullYear() && viewMonth > now.getMonth());
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const dayOfMonth = isCurrentMonth ? now.getDate() : isFutureMonth ? 1 : daysInMonth;

  const entries = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
    return allEntries.filter(e => e.date.startsWith(prefix));
  }, [allEntries, viewYear, viewMonth]);

  const fmt = n => `$${Math.round(n).toLocaleString("en-US")}`;
  const fmtD = n => `$${(+n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const totalSpend = useMemo(() => entries.reduce((s, e) => s + e.amount, 0), [entries]);
  const totalBudget = useMemo(() => Object.values(budgets).reduce((s, v) => s + v, 0), [budgets]);
  const alertableSpend = useMemo(() => entries.reduce((s, e) => (catTypes[e.category] || "expense") === "investment" ? s : s + e.amount, 0), [entries, catTypes]);
  const alertableBudget = useMemo(() => categories.reduce((s, c) => (catTypes[c] || "expense") === "investment" ? s : s + (budgets[c] || 0), 0), [categories, budgets, catTypes]);
  const byMember = useMemo(() => { const m = {}; memberNames.forEach(n => m[n] = 0); entries.forEach(e => { m[e.member] = (m[e.member] || 0) + e.amount; }); return m; }, [entries, memberNames]);
  const byCategory = useMemo(() => { const m = {}; categories.forEach(c => m[c] = 0); entries.forEach(e => { if (m[e.category] !== undefined) m[e.category] += e.amount; }); return m; }, [entries, categories]);
  const byMemberCategory = useMemo(() => { const m = {}; memberNames.forEach(n => { m[n] = {}; categories.forEach(c => { m[n][c] = 0; }); }); entries.forEach(e => { if (m[e.member] && m[e.member][e.category] !== undefined) m[e.member][e.category] += e.amount; }); return m; }, [entries, categories, memberNames]);
  const categoryStatuses = useMemo(() => { const m = {}; categories.forEach(c => { m[c] = getCategoryStatus(byCategory[c] || 0, budgets[c], dayOfMonth, daysInMonth, catTypes[c] || "expense"); }); return m; }, [byCategory, budgets, catTypes, dayOfMonth, daysInMonth, categories]);
  const alertCount = useMemo(() => categories.filter(c => (catTypes[c] || "expense") !== "investment" && categoryStatuses[c] !== "ok").length, [categories, catTypes, categoryStatuses]);
  const overCount = useMemo(() => categories.filter(c => (catTypes[c] || "expense") !== "investment" && categoryStatuses[c] === "over").length, [categories, catTypes, categoryStatuses]);
  const maxMemberSpend = Math.max(...Object.values(byMember), 1);

  const sectionStructure = useMemo(() => {
    const assigned = new Set(rawSections.map(r => r.category));
    const sectionMap = {}, sectionOrder = {};
    rawSections.sort((a, b) => a.order - b.order).forEach(r => {
      if (!sectionMap[r.section]) { sectionMap[r.section] = []; sectionOrder[r.section] = r.order; }
      if (categories.includes(r.category)) sectionMap[r.section].push(r.category);
    });
    const result = Object.entries(sectionMap).sort((a, b) => sectionOrder[a[0]] - sectionOrder[b[0]]).map(([name, cats]) => ({ name, cats }));
    const unassigned = categories.filter(c => !assigned.has(c));
    if (unassigned.length > 0) result.push({ name: "Other", cats: unassigned });
    return result;
  }, [rawSections, categories]);

  const sectionNames = useMemo(() => sectionStructure.filter(s => s.name !== "Other").map(s => s.name), [sectionStructure]);
  const catSection = useMemo(() => { const m = {}; rawSections.forEach(r => { m[r.category] = r.section; }); return m; }, [rawSections]);

  const sectionTotals = useMemo(() => {
    const t = {};
    sectionStructure.forEach(sec => {
      t[sec.name] = {
        spent: sec.cats.reduce((s, c) => s + (byCategory[c] || 0), 0),
        budget: sec.cats.reduce((s, c) => s + (budgets[c] || 0), 0),
        alertableSpent: sec.cats.reduce((s, c) => (catTypes[c] || "expense") === "investment" ? s : s + (byCategory[c] || 0), 0),
        alertableBudget: sec.cats.reduce((s, c) => (catTypes[c] || "expense") === "investment" ? s : s + (budgets[c] || 0), 0),
      };
    });
    return t;
  }, [sectionStructure, byCategory, budgets, catTypes]);

  const donutSegments = useMemo(() => sectionStructure.map((sec, i) => ({
    label: sec.name,
    value: sectionTotals[sec.name]?.spent || 0,
    color: sec.cats.length > 0 ? (catColors[sec.cats[0]] || PALETTE[i % PALETTE.length]) : PALETTE[i % PALETTE.length],
  })), [sectionStructure, sectionTotals, catColors]);

  const ltColor = (item, i) => item.color && item.color !== '' ? item.color : PALETTE[i % PALETTE.length];
  const diff = totalBudget - totalSpend;
  const overBudget = alertableSpend > alertableBudget + 2;

  const projection = useMemo(() => {
    if (!isCurrentMonth || dayOfMonth < 5) return null;
    const progress = dayOfMonth / daysInMonth;
    const projectedSpend = categories.reduce((sum, c) => {
      const type = catTypes[c] || "expense";
      const spent = byCategory[c] || 0;
      const budget = budgets[c] || 0;
      if (type === "investment" || type === "fixed") return sum + Math.max(spent, budget);
      const projected = progress > 0 ? spent / progress : spent;
      return sum + Math.max(projected, spent);
    }, 0);
    const projectedDiff = totalBudget - projectedSpend;
    const projectedOver = projectedDiff < -2;
    return { projectedSpend, projectedDiff, projectedOver };
  }, [isCurrentMonth, dayOfMonth, daysInMonth, categories, catTypes, byCategory, budgets, totalBudget]);

  const prevMonthTotals = useMemo(() => {
    const pm = viewMonth === 0 ? 11 : viewMonth - 1;
    const py = viewMonth === 0 ? viewYear - 1 : viewYear;
    const prefix = `${py}-${String(pm + 1).padStart(2, "0")}`;
    return allEntries.filter(e => e.date.startsWith(prefix)).reduce((s, e) => s + e.amount, 0);
  }, [allEntries, viewMonth, viewYear]);

  const goalPulse = useMemo(() => {
    if (longTerm.length === 0) return null;
    const nowStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const isGoalOnTrack = item => {
      const type = item.type || 'fixed';
      const isDebt = type === 'debt';
      if (isDebt ? item.saved <= 0 : item.saved >= item.goal) return true;
      if (!item.targetDate) return true;
      const [sy, sm] = nowStr.split('-').map(Number);
      const [ey, em] = item.targetDate.split('-').map(Number);
      const months = (ey - sy) * 12 + (em - sm);
      if (months <= 0) return isDebt ? item.saved <= 0 : item.saved >= item.goal;
      if (!item.monthlyContribution) return false;
      const monthly = item.monthlyContribution;
      if (type === 'investment') {
        const r = 0.07 / 12;
        const fv = item.saved * Math.pow(1+r, months) + monthly * ((Math.pow(1+r,months)-1)/r);
        return fv >= item.goal;
      }
      const remaining = isDebt ? item.saved : Math.max(item.goal - item.saved, 0);
      const projected = isDebt ? item.saved - monthly * months : item.saved + monthly * months;
      return isDebt ? projected <= 0 : projected >= item.goal;
    };
    const onTrack = longTerm.filter(isGoalOnTrack);
    return { total: longTerm.length, onTrack: onTrack.length };
  }, [longTerm, now]);

  const sortedEntries = useMemo(() => [...entries].sort((a, b) => new Date(b.date) - new Date(a.date)), [entries]);

  function prevMonth() { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); }
  function nextMonth() { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); }
  function toggleSection(name) { setExpandedSections(prev => ({ ...prev, [name]: !prev[name] })); }

  async function handleAddSubmit() {
    if (!form.member || !form.category || !form.amount || isNaN(+form.amount) || +form.amount <= 0) { showToast("Please fill all fields.", false); return; }
    const entry = { id: String(nextId), member: form.member, category: form.category, amount: parseFloat((+form.amount).toFixed(2)), date: new Date().toISOString().split("T")[0], notes: form.notes || '' };
    setSyncing(true);
    try { await api({ action: "addEntry", ...entry }); setAllEntries(prev => [entry, ...prev]); setNextId(n => n + 1); setForm({ member: "", category: "", amount: "", notes: "" }); showToast(`${fmtD(entry.amount)} logged.`); setView("dashboard"); }
    catch { showToast("Failed to save.", false); } finally { setSyncing(false); }
  }

  function openEditEntry(e) { setEditEntry(e); setEditForm({ member: e.member, category: e.category, amount: String(e.amount), date: e.date, notes: e.notes || '' }); }
  async function saveEditEntry() {
    if (!editForm.member || !editForm.category || !editForm.amount || isNaN(+editForm.amount) || +editForm.amount <= 0) { showToast("Please fill all fields.", false); return; }
    const updated = { ...editEntry, ...editForm, amount: parseFloat((+editForm.amount).toFixed(2)) };
    setSyncing(true);
    try { await api({ action: "updateEntry", ...updated }); setAllEntries(prev => prev.map(e => e.id === editEntry.id ? updated : e)); setEditEntry(null); showToast("Updated."); }
    catch { showToast("Failed.", false); } finally { setSyncing(false); }
  }
  async function deleteEntry(id) {
    setSyncing(true);
    try { await api({ action: "deleteEntry", id }); setAllEntries(prev => prev.filter(e => e.id !== id)); setEditEntry(null); showToast("Deleted."); }
    catch { showToast("Failed.", false); } finally { setSyncing(false); }
  }
  async function saveSectionsToSheet(secs) {
    try { await api({ action: "saveSections", sections: JSON.stringify(secs) }); }
    catch { showToast("Section sync failed.", false); }
  }
  async function saveBudgetsToSheet(nb, nc, nt) {
    try { await api({ action: "saveBudgets", budgets: JSON.stringify(Object.keys(nb).map(c => ({ category: c, budget: nb[c], color: nc[c] || PALETTE[0], type: nt[c] || "expense" }))) }); }
    catch { showToast("Budget sync failed.", false); }
  }
  function openNewCat() { setCatForm({ name: "", budget: "", color: PALETTE.find(p => !Object.values(catColors).includes(p)) || PALETTE[0], type: "expense", section: sectionNames[0] || "", newSection: "" }); setEditCat("new"); }
  function openEditCat(name) { setCatForm({ name, budget: String(budgets[name]), color: catColors[name], type: catTypes[name] || "expense", section: catSection[name] || "", newSection: "" }); setEditCat(name); }
  async function saveCat() {
    const name = catForm.name.trim();
    if (!name || !catForm.budget || isNaN(+catForm.budget) || +catForm.budget <= 0) { showToast("Fill name and budget.", false); return; }
    let nb = { ...budgets }, nc = { ...catColors }, nt = { ...catTypes };
    if (editCat === "new") { if (budgets[name]) { showToast("Already exists.", false); return; } nb[name] = parseFloat((+catForm.budget).toFixed(2)); nc[name] = catForm.color; nt[name] = catForm.type; }
    else { if (name !== editCat && budgets[name]) { showToast("Name taken.", false); return; } if (name !== editCat) { nb[name] = nb[editCat]; delete nb[editCat]; nc[name] = nc[editCat]; delete nc[editCat]; nt[name] = nt[editCat]; delete nt[editCat]; setAllEntries(prev => prev.map(e => e.category === editCat ? { ...e, category: name } : e)); } nb[name] = parseFloat((+catForm.budget).toFixed(2)); nc[name] = catForm.color; nt[name] = catForm.type; }
    const resolvedSection = catForm.section === "__new__" ? catForm.newSection.trim() : catForm.section;
    let newRawSections = rawSections.filter(r => r.category !== name && r.category !== editCat);
    if (resolvedSection) { const maxOrder = newRawSections.reduce((m, r) => Math.max(m, r.order), 0); newRawSections.push({ section: resolvedSection, category: name, order: maxOrder + 1 }); }
    setRawSections(newRawSections);
    setBudgets(nb); setCatColors(nc); setCatTypes(nt); setEditCat(null); showToast(editCat === "new" ? `"${name}" added.` : "Updated.");
    await saveBudgetsToSheet(nb, nc, nt);
    await saveSectionsToSheet(newRawSections);
  }
  async function deleteCat(catName) {
    if (categories.length <= 1) { showToast("Can't delete the last category.", false); return; }
    const nb = { ...budgets }; delete nb[catName]; const nc = { ...catColors }; delete nc[catName]; const nt = { ...catTypes }; delete nt[catName];
    setBudgets(nb); setCatColors(nc); setCatTypes(nt); setAllEntries(prev => prev.filter(e => e.category !== catName)); setEditCat(null); showToast(`"${catName}" deleted.`);
    await saveBudgetsToSheet(nb, nc, nt);
  }
  async function saveMembersToSheet(mems) {
    try { await api({ action: "saveMembers", members: JSON.stringify(mems.map(m => ({ name: m.name, color: m.color, role: m.role }))) }); }
    catch { showToast("Member sync failed.", false); }
  }
  function openNewMember() {
    if (members.length >= MAX_MEMBERS) { showToast(`Max ${MAX_MEMBERS} members.`, false); return; }
    const usedColors = members.map(m => m.color);
    const nextColor = MEMBER_COLOR_PALETTE.find(c => !usedColors.includes(c)) || MEMBER_COLOR_PALETTE[0];
    setMemberForm({ name: "", color: nextColor, role: "contributor" });
    setEditMember("new");
  }
  function openEditMember(name) {
    const m = members.find(m => m.name === name);
    if (!m) return;
    setMemberForm({ name: m.name, color: m.color, role: m.role });
    setEditMember(name);
  }
  async function saveMember() {
    const name = memberForm.name.trim();
    if (!name) { showToast("Name required.", false); return; }
    let nm;
    if (editMember === "new") { if (members.find(m => m.name === name)) { showToast("Name already taken.", false); return; } nm = [...members, { name, color: memberForm.color, role: memberForm.role }]; }
    else { nm = members.map(m => m.name === editMember ? { ...m, name, color: memberForm.color, role: memberForm.role } : m); if (name !== editMember) setAllEntries(prev => prev.map(e => e.member === editMember ? { ...e, member: name } : e)); }
    setMembers(nm); setEditMember(null); showToast(editMember === "new" ? `"${name}" added.` : "Updated.");
    await saveMembersToSheet(nm);
  }
  async function deleteMember(memberName) {
    if (members.length <= 1) { showToast("Need at least one member.", false); return; }
    const nm = members.filter(m => m.name !== memberName);
    setMembers(nm); setEditMember(null); showToast(`"${memberName}" removed.`);
    await saveMembersToSheet(nm);
  }
  function openNewLT() { setLtForm({ name: "", saved: "", goal: "", color: PALETTE[0], targetDate: "", startDate: new Date().toISOString().slice(0, 7), type: "fixed", monthlyContribution: "" }); setEditLT("new"); }
  function openEditLT(i) { const it = longTerm[i]; setLtForm({ name: it.name, saved: String(it.saved), goal: String(it.goal), color: it.color || PALETTE[0], targetDate: it.targetDate || "", startDate: it.startDate || "", type: it.type || "fixed", monthlyContribution: String(it.monthlyContribution || "") }); setEditLT(i); }
  async function saveLT() {
    const name = ltForm.name.trim();
    if (!name || ltForm.saved === "" || ltForm.goal === "" || isNaN(+ltForm.saved) || isNaN(+ltForm.goal)) { showToast("Fill all fields.", false); return; }
    let next = [...longTerm];
    const item = { name, saved: parseFloat((+ltForm.saved).toFixed(2)), goal: parseFloat((+ltForm.goal).toFixed(2)), color: ltForm.color || PALETTE[0], targetDate: ltForm.targetDate || "", startDate: ltForm.startDate || "", type: ltForm.type || "fixed", monthlyContribution: parseFloat((+ltForm.monthlyContribution).toFixed(2)) || 0 };
    if (editLT === "new") next.push(item); else next[editLT] = item;
    setLongTerm(next); setEditLT(null); showToast(editLT === "new" ? `"${name}" added.` : "Updated.");
    setSyncing(true);
    try { await api({ action: "saveLongTerm", items: JSON.stringify(next.map(it => ({ ...it, type: it.type || 'fixed', monthlyContribution: it.monthlyContribution || 0 }))) }); }
    catch { showToast("Sync failed.", false); } finally { setSyncing(false); }
  }
  async function deleteLT(i) {
    const next = longTerm.filter((_, idx) => idx !== i);
    setLongTerm(next); setEditLT(null); showToast("Deleted.");
    setSyncing(true);
    try { await api({ action: "saveLongTerm", items: JSON.stringify(next.map(it => ({ ...it, type: it.type || 'fixed', monthlyContribution: it.monthlyContribution || 0 }))) }); }
    catch { showToast("Sync failed.", false); } finally { setSyncing(false); }
  }

  const mw = isDesktop ? 1320 : 700;

  const MemberChips = ({ value, onChange }) => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {memberNames.map(m => (
        <button key={m} onClick={() => onChange(m)} style={{ flex: 1, minWidth: 70, padding: "10px 0", border: `1px solid ${value === m ? memberColors[m] : C.border}`, borderRadius: 10, background: value === m ? memberColors[m] + "20" : C.bgInset, color: value === m ? memberColors[m] : C.textLo, fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>{m}</button>
      ))}
    </div>
  );

  const SectionBlock = ({ mobile = false }) => (
    <>
      {sectionStructure.map(sec => {
        const totals = sectionTotals[sec.name];
        const isExpanded = !!expandedSections[sec.name];
        const secOver = totals.alertableSpent > totals.alertableBudget + 2;
        return (
          <div key={sec.name}>
            <div onClick={() => toggleSection(sec.name)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", cursor: "pointer", borderBottom: `1px solid ${C.borderMid}`, userSelect: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, color: C.textLo, display: "inline-block", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▶</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.textHi }}>{sec.name}</span>
                {secOver && <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 800 }}>!</span>}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: secOver ? "#ef4444" : C.sand, fontFamily: "'DM Mono',monospace" }}>{fmt(totals.spent)}</span>
                <span style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace" }}>/ {fmt(totals.budget)}</span>
              </div>
            </div>
            {isExpanded && sec.cats.map(c => {
              const status = categoryStatuses[c];
              const sc = STATUS[status];
              const spent = byCategory[c] || 0;
              return (
                <div key={c} style={{ display: "flex", alignItems: "center", padding: "9px 0 9px 16px", borderBottom: `1px solid ${C.borderMid}`, gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 2, background: catColors[c] || "#94a3b8", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ fontSize: 12, color: C.textMid, fontWeight: 500 }}>{truncate(c)}</span>
                        {status !== "ok" && (catTypes[c] || "expense") === "expense" && <span style={{ fontSize: 10, color: sc.color, fontWeight: 800 }}>{sc.icon}</span>}
                        {(catTypes[c] || "expense") === "investment" && <span style={{ fontSize: 9, color: "#388bfd", fontWeight: 700, background: "rgba(56,139,253,0.12)", padding: "1px 5px", borderRadius: 3 }}>↗</span>}
                        {(catTypes[c] || "expense") === "fixed" && <span style={{ fontSize: 9, color: C.textLo, fontWeight: 600, background: C.bgInset, padding: "1px 5px", borderRadius: 3, border: `1px solid ${C.border}` }}>fixed</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: sc.color, fontFamily: "'DM Mono',monospace" }}>{fmt(spent)}</span>
                        <span style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace" }}>/ {fmt(budgets[c])}</span>
                      </div>
                    </div>
                    <CategoryBar spent={spent} budget={budgets[c]} color={catColors[c] || C.accent} dayOfMonth={dayOfMonth} daysInMonth={daysInMonth} type={catTypes[c] || "expense"} />
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );

  return (
    <div style={{ minHeight: "100vh", background: theme === 'dark' ? "#0d0d0f" : "linear-gradient(135deg, #eef0f3 0%, #e8eaed 100%)", fontFamily: "'Sora', sans-serif", color: C.textHi, paddingBottom: 60 }}>

      {/* Ambient copper glow overlay */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: theme === 'dark'
          ? `radial-gradient(ellipse at 10% 10%, rgba(193,127,62,0.08) 0%, transparent 50%), radial-gradient(ellipse at 90% 90%, rgba(193,127,62,0.05) 0%, transparent 50%)`
          : `radial-gradient(ellipse at 10% 15%, rgba(193,127,62,0.13) 0%, transparent 45%), radial-gradient(ellipse at 90% 85%, rgba(193,127,62,0.09) 0%, transparent 45%)`,
      }} />

      {/* All content sits above the glow */}
      <div style={{ position: "relative", zIndex: 1 }}>

        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
          .npill { background: none; border: none; cursor: pointer; font-family: 'Sora',sans-serif; font-size: 13px; font-weight: 500; padding: 8px 15px; border-radius: 8px; transition: all 0.18s; color: ${C.textMid}; }
          .npill.active { background: ${C.accentDim}; color: ${C.accent}; font-weight: 700; }
          .npill:hover:not(.active) { color: ${C.textMid}; }
          .inp { width: 100%; background: ${C.bgInset}; border: 1px solid ${C.border}; border-radius: 10px; padding: 12px 14px; color: ${C.textHi}; font-family: 'Sora',sans-serif; font-size: 14px; outline: none; transition: border 0.18s; appearance: none; }
          .inp:focus { border-color: ${C.accent}; }
          .chip { display: inline-flex; align-items: center; gap: 5px; padding: 6px 13px; border-radius: 999px; font-size: 12px; font-weight: 600; border: none; cursor: pointer; font-family: 'Sora',sans-serif; transition: all 0.15s; }
          .cta { width: 100%; padding: 13px; border-radius: 11px; border: none; background: ${C.accent}; color: #fff; font-size: 14px; font-weight: 700; font-family: 'Sora',sans-serif; cursor: pointer; transition: opacity 0.2s; }
          .cta:hover { opacity: 0.85; }
          .cta:disabled { opacity: 0.35; cursor: not-allowed; }
          .del-btn { background: none; border: 1px solid #7f1d1d; color: #f87171; border-radius: 8px; padding: 8px 16px; font-family: 'Sora',sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; }
          .swatch { width: 20px; height: 20px; border-radius: 5px; cursor: pointer; border: 2px solid transparent; transition: transform 0.1s; }
          .swatch:hover { transform: scale(1.2); }
          .card { background: ${theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.75)'}; border: 1px solid ${C.border}; border-radius: 16px; backdrop-filter: blur(20px); box-shadow: ${theme === 'dark' ? '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(193,127,62,0.10)' : '0 4px 20px rgba(193,127,62,0.06), inset 0 1px 0 rgba(255,255,255,0.95)'}; }
          .month-btn { background: none; border: 1px solid ${C.border}; color: ${C.textLo}; border-radius: 8px; padding: 6px 14px; cursor: pointer; font-family: 'DM Mono',monospace; font-size: 12px; transition: all 0.15s; letter-spacing: 0.5px; }
          .month-btn:hover { border-color: ${C.accent}; color: ${C.accent}; }
          .lt-card { background: ${C.bgCard}; border: 1px solid ${C.border}; border-radius: 16px; padding: 20px; cursor: pointer; transition: border-color 0.15s, background 0.15s; }
          .lt-card:hover { background: ${C.bgInset}; border-color: ${C.sandDim}; }
          .tr-hdr { display: grid; grid-template-columns: 90px 52px 1fr 90px 1fr; border-bottom: 1px solid ${C.border}; padding-bottom: 8px; }
          .tr-row { display: grid; grid-template-columns: 90px 52px 1fr 90px 1fr; border-bottom: 1px solid ${C.borderMid}; cursor: pointer; transition: background 0.12s; }
          .tr-row:hover { background: ${C.bgInset}; }
          .tr-row:last-child { border-bottom: none; }
          .tr-hdr-m { display: grid; grid-template-columns: 64px 1fr 72px; border-bottom: 1px solid ${C.border}; padding-bottom: 8px; }
          .tr-row-m { display: grid; grid-template-columns: 64px 1fr 72px; border-bottom: 1px solid ${C.borderMid}; cursor: pointer; transition: background 0.12s; }
          .tr-row-m:hover { background: ${C.bgInset}; }
          .tr-row-m:last-child { border-bottom: none; }
          .tc { padding: 10px 10px; font-size: 12px; color: ${C.textMid}; display: flex; align-items: center; }
          @keyframes fu { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          .fu { animation: fu 0.3s cubic-bezier(.4,0,.2,1) both; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>

        {/* HEADER */}
        <header style={{
          background: theme === 'dark' ? "rgba(13,13,15,0.88)" : "rgba(238,240,243,0.88)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: `1px solid ${C.border}`,
          padding: isDesktop ? "0 24px" : "0 16px",
          position: "sticky", top: 0, zIndex: 100
        }}>
          <div style={{ maxWidth: mw, margin: "0 auto" }}>
            {isDesktop ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.5 }}>
                    <span style={{ color: C.accent }}>family</span><span style={{ color: C.textLo, fontWeight: 300 }}>·</span><span style={{ color: C.sand }}>budget</span>
                  </div>
                  {alertCount > 0 && <span style={{ background: overCount > 0 ? "#ef444418" : "#f9731618", color: overCount > 0 ? "#ef4444" : "#f97316", border: `1px solid ${overCount > 0 ? "#7f1d1d" : "#7c2d12"}`, fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "2px 9px", fontFamily: "'DM Mono',monospace" }}>{alertCount} alert{alertCount > 1 ? "s" : ""}</span>}
                  {syncing && <span style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 1 }}>SYNCING</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", gap: 2, background: C.bgInset, borderRadius: 10, padding: 3 }}>
                    {[["dashboard","Budget Dashboard"],["review","Review"],["trends","Trends"],["longterm","Long Term Goals"],["settings","Settings"]].map(([v, label]) => (
                      <button key={v} className={`npill ${view === v ? "active" : ""}`} onClick={() => setView(v)}>{label}</button>
                    ))}
                  </div>
                  <button onClick={() => setView("add")} style={{ background: view === "add" ? C.accentDim : C.accent, border: `1px solid ${view === "add" ? C.accent : "transparent"}`, borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700, padding: "9px 18px", cursor: "pointer", fontFamily: "'Sora',sans-serif" }}>+ Add</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.5, display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ color: C.accent }}>family</span><span style={{ color: C.textLo, fontWeight: 300 }}>·</span><span style={{ color: C.sand }}>budget</span>
                      {alertCount > 0 && <span style={{ background: overCount > 0 ? "#ef444418" : "#f9731618", color: overCount > 0 ? "#ef4444" : "#f97316", border: `1px solid ${overCount > 0 ? "#7f1d1d" : "#7c2d12"}`, fontSize: 9, fontWeight: 700, borderRadius: 999, padding: "2px 7px", fontFamily: "'DM Mono',monospace" }}>{alertCount}</span>}
                      {syncing && <span style={{ fontSize: 9, color: C.textLo, fontFamily: "'DM Mono',monospace" }}>SYNC</span>}
                    </div>
                    <div style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace", marginTop: 1, letterSpacing: 1 }}>{MONTH_NAMES[viewMonth].toUpperCase()} {viewYear}</div>
                  </div>
                  <button onClick={() => setView("add")} style={{ background: C.accent, border: "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700, padding: "8px 16px", cursor: "pointer", fontFamily: "'Sora',sans-serif" }}>+ Add</button>
                </div>
                <div style={{ borderTop: `1px solid ${C.border}`, marginLeft: -16, marginRight: -16, padding: "4px 6px", display: "flex", background: theme === 'dark' ? "rgba(13,13,15,0.88)" : "rgba(238,240,243,0.88)", gap: 2 }}>
                  {[["dashboard","Dashboard"],["review","Review"],["trends","Trends"],["longterm","Long Term"],["settings","Settings"]].map(([v, label]) => (
                    <button key={v} onClick={() => setView(v)} style={{ flex: 1, textAlign: "center", fontSize: 11, padding: "8px 2px", borderRadius: 7, border: "none", cursor: "pointer", fontFamily: "'Sora',sans-serif", fontWeight: view === v ? 600 : 500, background: view === v ? C.accentDim : "transparent", color: view === v ? C.accent : C.textMid, transition: "all 0.15s" }}>{label}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        {toast && <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: toast.ok ? "#0f2a1a" : "#2a0f0f", border: `1px solid ${toast.ok ? "#1a5c35" : "#5c1a1a"}`, color: toast.ok ? "#4ade80" : "#f87171", padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 500, boxShadow: "0 8px 40px rgba(0,0,0,0.6)" }}>{toast.msg}</div>}

        {/* Edit Entry Modal */}
        {editEntry && (
          <Modal onClose={() => setEditEntry(null)}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: C.textHi }}>Edit Entry</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div><FL>Member</FL><MemberChips value={editForm.member} onChange={m => setEditForm(f => ({ ...f, member: m }))} /></div>
              <div><FL>Category</FL><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{categories.map(c => (<button key={c} className="chip" onClick={() => setEditForm(f => ({ ...f, category: c }))} style={{ background: editForm.category === c ? catColors[c] + "25" : C.bgInset, border: `1px solid ${editForm.category === c ? catColors[c] : C.border}`, color: editForm.category === c ? catColors[c] : C.textLo }}>{c}</button>))}</div></div>
              <div><FL>Amount</FL><div style={{ position: "relative" }}><span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.textLo }}>$</span><input className="inp" type="number" min="0" step="0.01" value={editForm.amount} onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} style={{ paddingLeft: 28 }} /></div></div>
              <div><FL>Date</FL><input className="inp" type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} style={{ colorScheme: theme }} /></div>
              <div><FL>Notes</FL><textarea className="inp" value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ resize: "none", lineHeight: 1.5 }} /></div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}><button className="cta" onClick={saveEditEntry} disabled={syncing} style={{ flex: 1 }}>Save</button><button className="del-btn" onClick={() => deleteEntry(editEntry.id)}>Delete</button></div>
            </div>
          </Modal>
        )}

        {/* Edit Category Modal */}
        {editCat !== null && (
          <Modal onClose={() => setEditCat(null)}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: C.textHi }}>{editCat === "new" ? "New Category" : "Edit Category"}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div><FL>Name</FL><input className="inp" type="text" placeholder="e.g. Subscriptions" value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><FL>Monthly Budget</FL><div style={{ position: "relative" }}><span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.textLo }}>$</span><input className="inp" type="number" min="0" value={catForm.budget} onChange={e => setCatForm(f => ({ ...f, budget: e.target.value }))} style={{ paddingLeft: 28 }} /></div></div>
              <div>
                <FL>Category Type</FL>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { value: "expense", label: "Expense", desc: "Standard spending — full pacing logic applies" },
                    { value: "fixed", label: "Fixed", desc: "Recurring charge (rent, subscriptions) — no pacing warnings" },
                    { value: "investment", label: "Investment", desc: "Positive spend (stocks, savings) — counts toward budget, never flagged" },
                  ].map(opt => (
                    <div key={opt.value} onClick={() => setCatForm(f => ({ ...f, type: opt.value }))}
                      style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 8, cursor: "pointer", border: `1px solid ${catForm.type === opt.value ? (opt.value === "investment" ? "#388bfd" : opt.value === "fixed" ? C.textLo : C.accent) : C.border}`, background: catForm.type === opt.value ? (opt.value === "investment" ? "rgba(56,139,253,0.08)" : "rgba(255,255,255,0.03)") : "transparent" }}>
                      <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${catForm.type === opt.value ? C.accent : C.borderMid}`, background: catForm.type === opt.value ? C.accent : "transparent", flexShrink: 0, marginTop: 1 }} />
                      <div><div style={{ fontSize: 13, fontWeight: 600, color: C.textHi }}>{opt.label}</div><div style={{ fontSize: 11, color: C.textLo, marginTop: 2 }}>{opt.desc}</div></div>
                    </div>
                  ))}
                </div>
              </div>
              <div><FL>Color</FL><div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{PALETTE.map(p => (<div key={p} className="swatch" style={{ background: p, borderColor: catForm.color === p ? "#fff" : "transparent", boxShadow: catForm.color === p ? "0 0 0 1px #fff" : "none" }} onClick={() => setCatForm(f => ({ ...f, color: p }))} />))}</div></div>
              <div>
                <FL>Section</FL>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 8 }}>
                  {[...sectionNames, "__new__"].map(s => (
                    <button key={s} onClick={() => setCatForm(f => ({ ...f, section: s }))} className="chip" style={{ background: catForm.section === s ? C.accentDim : C.bgInset, border: `1px solid ${catForm.section === s ? C.accent : C.border}`, color: catForm.section === s ? C.textHi : C.textLo }}>
                      {s === "__new__" ? "+ New section" : s}
                    </button>
                  ))}
                  <button onClick={() => setCatForm(f => ({ ...f, section: "" }))} className="chip" style={{ background: catForm.section === "" ? C.bgInset : "transparent", border: `1px solid ${catForm.section === "" ? C.accent : C.border}`, color: catForm.section === "" ? C.textHi : C.textLo }}>None</button>
                </div>
                {catForm.section === "__new__" && (<input className="inp" placeholder="Section name e.g. Living" value={catForm.newSection} onChange={e => setCatForm(f => ({ ...f, newSection: e.target.value }))} style={{ marginTop: 6 }} />)}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}><button className="cta" onClick={saveCat} style={{ flex: 1 }}>{editCat === "new" ? "Add" : "Save"}</button>{editCat !== "new" && <button className="del-btn" onClick={() => deleteCat(editCat)}>Delete</button>}</div>
            </div>
          </Modal>
        )}

        {/* Edit LT Modal */}
        {editLT !== null && (
          <Modal onClose={() => setEditLT(null)}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: C.textHi }}>{editLT === "new" ? "New Goal" : "Edit Goal"}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div><FL>Name</FL><input className="inp" type="text" placeholder="e.g. Emergency Fund" value={ltForm.name} onChange={e => setLtForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div>
                <FL>Goal Type</FL>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { value: "fixed", label: "Savings", desc: "Building toward a fixed target (emergency fund, down payment, car)" },
                    { value: "investment", label: "Investment", desc: "Market-growth account — projects at 7% annual return" },
                    { value: "debt", label: "Debt payoff", desc: "Paying down a balance (mortgage extra, loan, credit card)" },
                  ].map(opt => (
                    <div key={opt.value} onClick={() => setLtForm(f => ({ ...f, type: opt.value }))}
                      style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 12px", borderRadius: 8, cursor: "pointer", background: ltForm.type === opt.value ? C.accentDim : C.bgInset, border: `1px solid ${ltForm.type === opt.value ? C.accent : C.border}`, transition: "all 0.15s" }}>
                      <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${ltForm.type === opt.value ? C.accent : C.textLo}`, background: ltForm.type === opt.value ? C.accent : "transparent", flexShrink: 0, marginTop: 2, transition: "all 0.15s" }} />
                      <div><div style={{ fontSize: 13, fontWeight: 600, color: ltForm.type === opt.value ? C.textHi : C.textMid }}>{opt.label}</div><div style={{ fontSize: 11, color: C.textLo, marginTop: 1 }}>{opt.desc}</div></div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}><FL>{ltForm.type === 'debt' ? 'Current Balance' : 'Current Amount'}</FL><div style={{ position: "relative" }}><span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.textLo }}>$</span><input className="inp" type="number" min="0" step="0.01" value={ltForm.saved} onChange={e => setLtForm(f => ({ ...f, saved: e.target.value }))} style={{ paddingLeft: 28 }} /></div></div>
                <div style={{ flex: 1 }}><FL>{ltForm.type === 'debt' ? 'Original Balance' : 'Goal Amount'}</FL><div style={{ position: "relative" }}><span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.textLo }}>$</span><input className="inp" type="number" min="0" step="0.01" value={ltForm.goal} onChange={e => setLtForm(f => ({ ...f, goal: e.target.value }))} style={{ paddingLeft: 28 }} /></div></div>
              </div>
              <div><FL>{ltForm.type === 'debt' ? 'Monthly Extra Payment' : 'Monthly Contribution'}</FL><div style={{ position: "relative" }}><span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.textLo }}>$</span><input className="inp" type="number" min="0" step="0.01" placeholder="0.00" value={ltForm.monthlyContribution} onChange={e => setLtForm(f => ({ ...f, monthlyContribution: e.target.value }))} style={{ paddingLeft: 28 }} /></div><div style={{ fontSize: 10, color: C.textLo, marginTop: 5 }}>{ltForm.type === 'investment' ? 'Used to project growth at 7% annual return' : 'Used to calculate on-track pacing'}</div></div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}><FL>Start Date</FL><input className="inp" type="month" value={ltForm.startDate} onChange={e => setLtForm(f => ({ ...f, startDate: e.target.value }))} style={{ colorScheme: theme }} /></div>
                <div style={{ flex: 1 }}><FL>Target Date</FL><input className="inp" type="month" value={ltForm.targetDate} onChange={e => setLtForm(f => ({ ...f, targetDate: e.target.value }))} style={{ colorScheme: theme }} /></div>
              </div>
              <div><FL>Color</FL><div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{PALETTE.map(p => (<div key={p} className="swatch" style={{ background: p, borderColor: ltForm.color === p ? "#fff" : "transparent", boxShadow: ltForm.color === p ? "0 0 0 1px #fff" : "none" }} onClick={() => setLtForm(f => ({ ...f, color: p }))} />))}</div></div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}><button className="cta" onClick={saveLT} disabled={syncing} style={{ flex: 1 }}>{editLT === "new" ? "Add Goal" : "Save"}</button>{editLT !== "new" && <button className="del-btn" onClick={() => deleteLT(editLT)}>Delete</button>}</div>
            </div>
          </Modal>
        )}

        <div style={{ maxWidth: mw, margin: "0 auto", padding: isDesktop ? "28px 24px" : "20px 16px" }}>
          {loading ? <Spinner /> : error ? (
            <div style={{ textAlign: "center", padding: 48 }}>
              <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 12, fontFamily: "'DM Mono',monospace", letterSpacing: 1 }}>CONNECTION ERROR</div>
              <div style={{ fontSize: 12, color: C.textLo, marginBottom: 24 }}>{error}</div>
              <button className="cta" onClick={loadData} style={{ maxWidth: 140, margin: "0 auto" }}>Retry</button>
            </div>
          ) : (
            <>
              {/* DASHBOARD */}
              {view === "dashboard" && (
                <div className="fu">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                    <button className="month-btn" onClick={prevMonth}>← {MONTH_NAMES[viewMonth === 0 ? 11 : viewMonth - 1].slice(0, 3)}</button>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.textHi, letterSpacing: -0.3 }}>{MONTH_NAMES[viewMonth]} {viewYear}</div>
                      {isFutureMonth && <div style={{ fontSize: 9, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 2 }}>FUTURE</div>}
                    </div>
                    <button className="month-btn" onClick={nextMonth}>{MONTH_NAMES[viewMonth === 11 ? 0 : viewMonth + 1].slice(0, 3)} →</button>
                  </div>

                  {/* Hero */}
                  <div className="card" style={{ padding: isDesktop ? "28px 32px" : "20px 18px", marginBottom: 16 }}>
                    {isDesktop ? (
                      <div style={{ display: "flex", gap: 32, alignItems: "stretch" }}>
                        <div style={{ display: "flex", gap: 28, alignItems: "center", flexShrink: 0, minWidth: 320 }}>
                          <HeroDonut segments={donutSegments} totalSpend={totalSpend} totalBudget={totalBudget} size={160} hoveredLabel={hoveredSegment} onHover={setHoveredSegment} />
                          <div style={{ display: "flex", flexDirection: "column", gap: 11, justifyContent: "center" }}>
                            {donutSegments.filter(s => s.value > 0).map((s, i) => (
                              <LegendItem key={i} color={s.color} label={s.label} value={s.value} fmt={fmt}
                                isHovered={hoveredSegment === s.label}
                                isMuted={hoveredSegment !== null && hoveredSegment !== s.label}
                                onMouseEnter={() => setHoveredSegment(s.label)}
                                onMouseLeave={() => setHoveredSegment(null)}
                              />
                            ))}
                          </div>
                        </div>
                        <div style={{ width: 1, background: C.border, flexShrink: 0, alignSelf: "stretch" }} />
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 18, paddingLeft: 4 }}>
                          <div style={{ display: "flex", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
                            <div>
                              <div style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 1.5, marginBottom: 6 }}>spent</div>
                              <div style={{ fontSize: 42, fontWeight: 800, color: overBudget ? "#f85149" : C.textHi, letterSpacing: -2, lineHeight: 1, fontFamily: "'DM Mono',monospace" }}>{fmt(totalSpend)}</div>
                            </div>
                            <div style={{ paddingBottom: 6 }}>
                              <div style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 1.5, marginBottom: 6 }}>budget</div>
                              <div style={{ fontSize: 22, fontWeight: 700, color: C.textLo, letterSpacing: -0.5, lineHeight: 1, fontFamily: "'DM Mono',monospace" }}>{fmt(totalBudget)}</div>
                            </div>
                            <div style={{ paddingBottom: 8 }}>
                              <div style={{ display: "inline-flex", alignItems: "center", padding: "6px 14px", borderRadius: 7, background: diff >= 0 ? "rgba(35,134,54,0.15)" : "rgba(218,54,51,0.15)", color: diff >= 0 ? "#3fb950" : "#f85149", fontFamily: "'DM Mono',monospace", fontWeight: 700, fontSize: 14 }}>
                                {diff >= 0 ? "+" : "−"}{fmt(Math.abs(diff))} {diff >= 0 ? "under" : "over"}
                              </div>
                            </div>
                          </div>
                          <div>
                            <div style={{ background: C.borderMid, borderRadius: 999, height: 4, overflow: "hidden", position: "relative" }}>
                              <div style={{ width: `${Math.min((totalSpend / Math.max(totalBudget, 1)) * 100, 100)}%`, height: "100%", borderRadius: 999, transition: "width 0.5s", background: overBudget ? "#f85149" : `linear-gradient(90deg, ${C.accent}, #3fb950)` }} />
                              {isCurrentMonth && <div style={{ position: "absolute", top: 0, bottom: 0, left: `${(dayOfMonth / daysInMonth) * 100}%`, width: 2, background: "rgba(255,255,255,0.3)", transform: "translateX(-50%)" }} />}
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                              <div style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace" }}>{isCurrentMonth ? `day ${dayOfMonth} of ${daysInMonth}` : isFutureMonth ? "future" : "past month"}</div>
                              <div style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace" }}>{Math.round((totalSpend / Math.max(totalBudget, 1)) * 100)}% of budget</div>
                            </div>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: members.length <= 2 ? "1fr 1fr" : "1fr 1fr 1fr", gap: "10px 24px" }}>
                            {memberNames.map(m => (
                              <div key={m}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                                  <span style={{ fontSize: 12, color: memberColors[m], fontWeight: 600 }}>{m}</span>
                                  <span style={{ fontSize: 12, color: memberColors[m], fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{fmt(byMember[m])}</span>
                                </div>
                                <div style={{ background: C.borderMid, borderRadius: 999, height: 4 }}>
                                  <div style={{ width: `${(byMember[m] / maxMemberSpend) * 100}%`, height: "100%", background: memberColors[m], borderRadius: 999, transition: "width 0.5s" }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ textAlign: "center", marginBottom: 16 }}>
                          <div style={{ fontSize: 42, fontWeight: 800, color: overBudget ? "#f85149" : C.textHi, fontFamily: "'DM Mono',monospace", letterSpacing: -2, lineHeight: 1 }}>{fmt(totalSpend)}</div>
                          <div style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 1, marginTop: 5 }}>spent this month</div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                          <div style={{ background: C.bgInset, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" }}>
                            <div style={{ fontSize: 9, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 1, marginBottom: 3 }}>budget</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: -0.5 }}>{fmt(totalBudget)}</div>
                          </div>
                          <div style={{ background: diff >= 0 ? "rgba(35,134,54,0.1)" : "rgba(218,54,51,0.1)", border: `0.5px solid ${diff >= 0 ? "rgba(35,134,54,0.3)" : "rgba(218,54,51,0.3)"}`, borderRadius: 10, padding: "10px 12px" }}>
                            <div style={{ fontSize: 9, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 1, marginBottom: 3 }}>remaining</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: diff >= 0 ? "#3fb950" : "#f85149", fontFamily: "'DM Mono',monospace", letterSpacing: -0.5 }}>{diff >= 0 ? "+" : "−"}{fmt(Math.abs(diff))}</div>
                          </div>
                        </div>
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ background: C.borderMid, borderRadius: 999, height: 4, overflow: "hidden" }}>
                            <div style={{ width: `${Math.min((totalSpend / Math.max(totalBudget, 1)) * 100, 100)}%`, height: "100%", borderRadius: 999, transition: "width 0.5s", background: overBudget ? "#f85149" : `linear-gradient(90deg, ${C.accent}, #3fb950)` }} />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                            <div style={{ fontSize: 9, color: C.textLo, fontFamily: "'DM Mono',monospace" }}>{isCurrentMonth ? `day ${dayOfMonth} of ${daysInMonth}` : isFutureMonth ? "future" : "past month"}</div>
                            <div style={{ fontSize: 9, color: C.textLo, fontFamily: "'DM Mono',monospace" }}>{Math.round((totalSpend / Math.max(totalBudget, 1)) * 100)}%</div>
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 8px", paddingTop: 18, paddingBottom: 18, borderTop: `1px solid ${C.borderMid}`, borderBottom: `1px solid ${C.borderMid}`, marginTop: 8, marginBottom: 8 }}>
                          {donutSegments.filter(s => s.value > 0).map((s, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ width: 7, height: 7, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                              <span style={{ fontSize: 10, color: C.textMid, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
                              <span style={{ fontSize: 10, color: s.color, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{fmt(s.value)}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px", marginTop: 14 }}>
                          {memberNames.map(m => (
                            <div key={m}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                <span style={{ fontSize: 10, color: memberColors[m], fontWeight: 600 }}>{m}</span>
                                <span style={{ fontSize: 10, color: memberColors[m], fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{fmt(byMember[m])}</span>
                              </div>
                              <div style={{ background: C.borderMid, borderRadius: 999, height: 3 }}>
                                <div style={{ width: `${(byMember[m] / maxMemberSpend) * 100}%`, height: "100%", background: memberColors[m], borderRadius: 999, transition: "width 0.5s" }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Projection + Pulse */}
                  {(isCurrentMonth || (!isCurrentMonth && !isFutureMonth)) && (
                    <div className="card" style={{ padding: isDesktop ? "18px 28px" : "14px 18px", marginBottom: 16 }}>
                      {isCurrentMonth ? (
                        <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1px 1fr 1px 1fr" : "1fr", gap: isDesktop ? 0 : 16 }}>
                          <div style={{ padding: isDesktop ? "4px 28px 4px 0" : 0 }}>
                            <div style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 1, marginBottom: 8 }}>projected month-end</div>
                            {projection && dayOfMonth >= 5 ? (
                              <>
                                <div style={{ fontSize: isDesktop ? 28 : 24, fontWeight: 800, color: projection.projectedOver ? "#f85149" : "#3fb950", fontFamily: "'DM Mono',monospace", letterSpacing: -1, lineHeight: 1, marginBottom: 6 }}>
                                  {projection.projectedDiff >= 0 ? "+" : "−"}{fmt(Math.abs(projection.projectedDiff))}
                                </div>
                                <div style={{ fontSize: 12, color: C.textLo }}>{projection.projectedOver ? `on track to exceed budget by ${fmt(Math.abs(projection.projectedDiff))}` : `on track to finish ${fmt(Math.round(projection.projectedDiff))} under budget`}</div>
                              </>
                            ) : (<div style={{ fontSize: 12, color: C.textLo, marginTop: 4 }}>projection available after day 5</div>)}
                          </div>
                          {isDesktop && <div style={{ background: C.border, width: 1, alignSelf: "stretch" }} />}
                          <div style={{ padding: isDesktop ? "4px 28px" : 0 }}>
                            <div style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 1, marginBottom: 8 }}>vs last month</div>
                            {prevMonthTotals > 0 ? (
                              <>
                                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                                  <span style={{ fontSize: isDesktop ? 28 : 24, fontWeight: 800, color: totalSpend < prevMonthTotals ? "#3fb950" : totalSpend > prevMonthTotals * 1.05 ? "#f85149" : C.textMid, fontFamily: "'DM Mono',monospace", letterSpacing: -1, lineHeight: 1 }}>
                                    {totalSpend < prevMonthTotals ? "↓" : totalSpend > prevMonthTotals * 1.05 ? "↑" : "→"}
                                  </span>
                                  {totalSpend !== prevMonthTotals && <span style={{ fontSize: 16, fontWeight: 700, color: totalSpend < prevMonthTotals ? "#3fb950" : "#f85149", fontFamily: "'DM Mono',monospace" }}>{fmt(Math.abs(totalSpend - prevMonthTotals))}</span>}
                                </div>
                                <div style={{ fontSize: 12, color: C.textLo }}>{totalSpend < prevMonthTotals ? "less spent so far" : totalSpend > prevMonthTotals * 1.05 ? "more spent so far" : "similar pace to last month"}</div>
                              </>
                            ) : (<div style={{ fontSize: 12, color: C.textLo, marginTop: 4 }}>no prior month data</div>)}
                          </div>
                          {isDesktop && <div style={{ background: C.border, width: 1, alignSelf: "stretch" }} />}
                          <div style={{ padding: isDesktop ? "4px 0 4px 28px" : 0 }}>
                            <div style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 1, marginBottom: 8 }}>long-term goals</div>
                            {goalPulse ? (() => {
                              const pct = goalPulse.total > 0 ? goalPulse.onTrack / goalPulse.total : 0;
                              const goalColor = pct >= 0.66 ? "#3fb950" : pct >= 0.34 ? "#eab308" : "#f85149";
                              const goalLabel = pct >= 0.66 ? "on track" : pct >= 0.34 ? "needs attention" : "off track";
                              return (
                                <>
                                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                                    <span style={{ fontSize: isDesktop ? 28 : 24, fontWeight: 800, color: goalColor, fontFamily: "'DM Mono',monospace", letterSpacing: -1, lineHeight: 1 }}>
                                      {goalPulse.onTrack}<span style={{ fontSize: 14, color: C.textLo }}>/{goalPulse.total}</span>
                                    </span>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <div style={{ fontSize: 12, color: goalColor }}>{goalLabel}</div>
                                    <button onClick={() => setView("longterm")} style={{ background: "none", border: "none", color: C.textLo, fontSize: 11, fontFamily: "'DM Mono',monospace", cursor: "pointer", padding: 0 }}>view →</button>
                                  </div>
                                </>
                              );
                            })() : (
                              <>
                                <div style={{ fontSize: 12, color: C.textLo, marginBottom: 8, marginTop: 4 }}>no goals set yet</div>
                                <button onClick={() => setView("longterm")} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, color: C.textLo, fontSize: 11, fontFamily: "'DM Mono',monospace", padding: "4px 10px", cursor: "pointer" }}>add a goal →</button>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "auto 1px 1fr" : "1fr", gap: isDesktop ? 0 : 10 }}>
                          <div style={{ padding: isDesktop ? "4px 28px 4px 0" : 0 }}>
                            <div style={{ fontSize: 9, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 1.5, marginBottom: 6 }}>final result</div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: diff >= 0 ? "#3fb950" : "#f85149", fontFamily: "'DM Mono',monospace", letterSpacing: -0.5, lineHeight: 1 }}>{diff >= 0 ? "+" : "−"}{fmt(Math.abs(diff))} {diff >= 0 ? "under" : "over"}</div>
                          </div>
                          {isDesktop && <div style={{ background: C.border, width: 1, alignSelf: "stretch" }} />}
                          {prevMonthTotals > 0 && (
                            <div style={{ padding: isDesktop ? "4px 0 4px 28px" : 0, display: "flex", alignItems: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                <span style={{ fontSize: 14, color: totalSpend < prevMonthTotals ? "#3fb950" : "#f85149" }}>{totalSpend < prevMonthTotals ? "↓" : "↑"}</span>
                                <span style={{ fontSize: 12, color: C.textMid }}>{totalSpend < prevMonthTotals ? `${fmt(prevMonthTotals - totalSpend)} less than the month before` : `${fmt(totalSpend - prevMonthTotals)} more than the month before`}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sections + Breakdown */}
                  {isDesktop ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <div className="card" style={{ padding: "20px 24px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <div style={{ fontSize: 11, color: C.textMid, fontFamily: "'Sora',sans-serif", fontWeight: 600 }}>Spending</div>
                          {isCurrentMonth && <div style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace", display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 1.5, height: 8, background: "rgba(255,255,255,0.25)", borderRadius: 1 }} /> TODAY</div>}
                        </div>
                        <SectionBlock />
                      </div>
                      <div className="card" style={{ padding: "0", overflow: "hidden" }}>
                        <div onClick={() => setBreakdownOpen(o => !o)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none", padding: "16px 20px" }}>
                          <div style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 2 }}>MEMBER BREAKDOWN</div>
                          <span style={{ fontSize: 10, color: C.textLo, transform: breakdownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", display: "inline-block" }}>▼</span>
                        </div>
                        {breakdownOpen && (
                          <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${C.borderMid}` }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 14 }}>
                              <thead><tr><th style={{ textAlign: "left", color: C.textLo, padding: "0 0 10px", fontWeight: 500, fontSize: 10, fontFamily: "'DM Mono',monospace", letterSpacing: 1 }}>Category</th>{memberNames.map(m => (<th key={m} style={{ textAlign: "right", color: memberColors[m], padding: "0 0 10px 10px", fontWeight: 600, fontSize: 11 }}>{m}</th>))}</tr></thead>
                              <tbody>{categories.filter(c => (byCategory[c] || 0) > 0).map(c => (
                                <tr key={c} style={{ borderTop: `1px solid ${C.borderMid}` }}>
                                  <td style={{ padding: "8px 0", color: C.textMid, display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 5, height: 5, borderRadius: 1, background: catColors[c] || C.textLo, display: "inline-block", flexShrink: 0 }} />{truncate(c, 30)}</td>
                                  {memberNames.map(m => (<td key={m} style={{ textAlign: "right", padding: "8px 0 8px 10px", color: (byMemberCategory[m] && byMemberCategory[m][c]) > 0 ? C.textHi : C.borderMid, fontFamily: "'DM Mono',monospace", fontSize: 11 }}>{(byMemberCategory[m] && byMemberCategory[m][c]) > 0 ? fmt(byMemberCategory[m][c]) : "—"}</td>))}
                                </tr>
                              ))}</tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div className="card" style={{ padding: "18px 16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <div style={{ fontSize: 11, color: C.textMid, fontFamily: "'Sora',sans-serif", fontWeight: 600 }}>Spending</div>
                          {isCurrentMonth && <div style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace" }}>| TODAY</div>}
                        </div>
                        <SectionBlock mobile />
                      </div>
                      <div className="card" style={{ padding: "18px 16px" }}>
                        <div onClick={() => setBreakdownOpen(o => !o)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}>
                          <div style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 2 }}>BREAKDOWN</div>
                          <span style={{ fontSize: 10, color: C.textLo, transform: breakdownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", display: "inline-block" }}>▼</span>
                        </div>
                        {breakdownOpen && (
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 14 }}>
                            <thead><tr><th style={{ textAlign: "left", color: C.textLo, padding: "0 0 10px", fontWeight: 500, fontSize: 10, fontFamily: "'DM Mono',monospace", letterSpacing: 1 }}>Category</th>{memberNames.map(m => (<th key={m} style={{ textAlign: "right", color: memberColors[m], padding: "0 0 10px 10px", fontWeight: 600 }}>{m}</th>))}</tr></thead>
                            <tbody>{categories.filter(c => (byCategory[c] || 0) > 0).map(c => (
                              <tr key={c} style={{ borderTop: `1px solid ${C.borderMid}` }}>
                                <td style={{ padding: "8px 0", color: C.textMid, display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 5, height: 5, borderRadius: 1, background: catColors[c] || C.textLo, display: "inline-block" }} />{c}</td>
                                {memberNames.map(m => (<td key={m} style={{ textAlign: "right", padding: "8px 0 8px 10px", color: (byMemberCategory[m] && byMemberCategory[m][c]) > 0 ? C.textHi : C.borderMid, fontFamily: "'DM Mono',monospace" }}>{(byMemberCategory[m] && byMemberCategory[m][c]) > 0 ? fmt(byMemberCategory[m][c]) : "—"}</td>))}
                              </tr>
                            ))}</tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Entries */}
                  <div className="card" style={{ padding: isDesktop ? "20px 24px" : "18px 16px", marginTop: 16 }}>
                    {isDesktop ? (
                      <div style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 2, marginBottom: 14 }}>ENTRIES <span style={{ color: C.borderMid, fontSize: 9 }}>· CLICK TO EDIT</span></div>
                    ) : (
                      <div onClick={() => setEntriesOpen(o => !o)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none", marginBottom: entriesOpen ? 14 : 0 }}>
                        <div style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 2 }}>ENTRIES <span style={{ color: C.borderMid, fontSize: 9 }}>· TAP TO EDIT</span></div>
                        <span style={{ fontSize: 10, color: C.textLo, transform: entriesOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", display: "inline-block" }}>▼</span>
                      </div>
                    )}
                    {(isDesktop || entriesOpen) ? (sortedEntries.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "28px 0", color: C.textLo, fontSize: 12 }}>No entries for {MONTH_NAMES[viewMonth]}.</div>
                    ) : isDesktop ? (
                      <>
                        <div className="tr-hdr">{["DATE","WHO","CATEGORY","AMOUNT","NOTES"].map(h => (<div key={h} style={{ padding: "0 10px", fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 1.5 }}>{h}</div>))}</div>
                        {(showAllEntries ? sortedEntries : sortedEntries.slice(0, 10)).map((e, i) => (
                          <div key={e.id} className="tr-row" style={{ background: i % 2 === 1 ? C.bgInset : "transparent" }} onClick={() => openEditEntry(e)}>
                            <div className="tc" style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: C.textLo }}>{e.date.slice(0, 10)}</div>
                            <div className="tc"><div style={{ width: 22, height: 22, borderRadius: 6, background: (memberColors[e.member] || C.textLo) + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: memberColors[e.member] || C.textLo }}>{e.member ? e.member[0] : "?"}</div></div>
                            <div className="tc" style={{ gap: 6 }}><span style={{ width: 5, height: 5, borderRadius: 1, background: catColors[e.category] || C.textLo, display: "inline-block", flexShrink: 0 }} /><span style={{ color: C.textMid, fontSize: 12 }}>{e.category}</span></div>
                            <div className="tc" style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: catColors[e.category] || C.textMid, fontSize: 12 }}>{fmtD(e.amount)}</div>
                            <div className="tc" style={{ color: C.textLo, fontSize: 11 }}>{e.notes || <span style={{ color: C.borderMid }}>—</span>}</div>
                          </div>
                        ))}
                        {sortedEntries.length > 10 && (
                          <div style={{ textAlign: "center", paddingTop: 12 }}>
                            <button onClick={() => setShowAllEntries(v => !v)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, color: C.textLo, fontSize: 11, fontFamily: "'DM Mono',monospace", padding: "5px 16px", cursor: "pointer", letterSpacing: 0.5 }}
                              onMouseEnter={e => { e.target.style.color = C.textHi; e.target.style.borderColor = C.textMid; }}
                              onMouseLeave={e => { e.target.style.color = C.textLo; e.target.style.borderColor = C.border; }}>
                              {showAllEntries ? "show less ↑" : `show all ${sortedEntries.length} entries ↓`}
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="tr-hdr-m">{["DATE","DETAILS","AMT"].map(h => (<div key={h} style={{ padding: "0 10px", fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 1.5 }}>{h}</div>))}</div>
                        {sortedEntries.map((e, i) => (
                          <div key={e.id} className="tr-row-m" style={{ background: i % 2 === 1 ? C.bgInset : "transparent" }} onClick={() => openEditEntry(e)}>
                            <div style={{ padding: "10px", fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace", display: "flex", alignItems: "center" }}>{e.date.slice(5, 10)}</div>
                            <div style={{ padding: "10px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 2 }}>
                              <div style={{ fontSize: 12, color: C.textMid, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 4, height: 4, borderRadius: 1, background: catColors[e.category] || C.textLo, display: "inline-block" }} />{e.category}</div>
                              <div style={{ fontSize: 10, color: C.textLo }}>{e.member}{e.notes ? ` · ${e.notes}` : ""}</div>
                            </div>
                            <div style={{ padding: "10px", display: "flex", alignItems: "center", justifyContent: "flex-end", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: catColors[e.category] || C.textMid, fontSize: 12 }}>{fmtD(e.amount)}</div>
                          </div>
                        ))}
                      </>
                    )) : null}
                  </div>
                </div>
              )}

              {/* ADD */}
              {view === "add" && (
                <div className="fu" style={{ maxWidth: 440, margin: "0 auto" }}>
                  <div className="card" style={{ padding: 28 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: C.textHi }}>Log a spend</div>
                    <div style={{ fontSize: 13, color: C.textLo, marginBottom: 24 }}>Who's spending, what category, how much.</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                      <div><FL>Who are you?</FL><MemberChips value={form.member} onChange={m => setForm(f => ({ ...f, member: m }))} /></div>
                      <div>
                        <FL>Category</FL>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                          {categories.map(c => {
                            const status = categoryStatuses[c];
                            const isSelected = form.category === c;
                            return (
                              <button key={c} className="chip" onClick={() => setForm(f => ({ ...f, category: c }))} style={{ background: isSelected ? catColors[c] + "25" : C.bgInset, border: `1px solid ${isSelected ? catColors[c] : status !== "ok" ? STATUS[status].color + "50" : C.border}`, color: isSelected ? catColors[c] : status !== "ok" ? STATUS[status].color : C.textLo }}>
                                {status !== "ok" && <span style={{ fontSize: 9 }}>{STATUS[status].icon}</span>}{c}
                              </button>
                            );
                          })}
                        </div>
                        {form.category && (
                          <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10, background: C.bgInset, border: `1px solid ${C.border}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 6 }}>
                              <span style={{ color: C.textLo }}>{form.category}</span>
                              <span style={{ color: STATUS[categoryStatuses[form.category]].color, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{fmt(byCategory[form.category] || 0)} / {fmt(budgets[form.category])}</span>
                            </div>
                            <CategoryBar spent={byCategory[form.category] || 0} budget={budgets[form.category]} color={catColors[form.category] || C.accent} dayOfMonth={dayOfMonth} daysInMonth={daysInMonth} type={catTypes[form.category] || "expense"} />
                          </div>
                        )}
                      </div>
                      <div><FL>Amount</FL><div style={{ position: "relative" }}><span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.textLo, fontSize: 15 }}>$</span><input className="inp" type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={{ paddingLeft: 30, fontSize: 16 }} /></div></div>
                      <div><FL>Notes (optional)</FL><textarea className="inp" placeholder="e.g. Costco run…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ resize: "none", lineHeight: 1.5 }} /></div>
                      <button className="cta" onClick={handleAddSubmit} disabled={syncing}>{syncing ? "Saving…" : "Log Spend"}</button>
                    </div>
                  </div>
                </div>
              )}

              {/* SETTINGS */}
              {view === "settings" && (() => {
                const Section = ({ title, open, onToggle, action, children }) => (
                  <div className="card" style={{ marginBottom: 14, overflow: "hidden" }}>
                    <div onClick={onToggle} style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.textHi }}>{title}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {action && <div onClick={e => e.stopPropagation()}>{action}</div>}
                        <span style={{ fontSize: 10, color: C.textLo, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", display: "inline-block" }}>▼</span>
                      </div>
                    </div>
                    {open && <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${C.borderMid}` }}>{children}</div>}
                  </div>
                );
                return (
                  <div className="fu" style={{ maxWidth: isDesktop ? 900 : "100%" }}>
                    <div style={{ fontSize: isDesktop ? 20 : 16, fontWeight: 800, color: C.textHi, letterSpacing: -0.5, marginBottom: 20 }}>Settings</div>
                    <div style={{ display: isDesktop ? "grid" : "block", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

                      <Section title="Categories" open={settingsBudgetOpen} onToggle={() => setSettingsBudgetOpen(v => !v)}
                        action={<button onClick={openNewCat} style={{ background: C.bgInset, border: `1px solid ${C.border}`, borderRadius: 8, color: C.sand, fontSize: 12, fontWeight: 600, padding: "6px 12px", cursor: "pointer", fontFamily: "'Sora',sans-serif" }}>+ New</button>}>
                        <div style={{ paddingTop: 12 }}>
                          {categories.map(c => {
                            const status = categoryStatuses[c];
                            const sc = STATUS[status];
                            const ctype = catTypes[c] || "expense";
                            return (
                              <div key={c} onClick={() => openEditCat(c)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 8px", borderBottom: `1px solid ${C.borderMid}`, cursor: "pointer", borderRadius: 8, transition: "background 0.12s" }} onMouseEnter={e => e.currentTarget.style.background = C.bgInset} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <div style={{ width: 10, height: 10, borderRadius: 3, background: catColors[c] || C.textLo, flexShrink: 0 }} />
                                  <span style={{ fontSize: 13, color: C.textHi, fontWeight: 600 }}>{truncate(c, 30)}</span>
                                  {ctype === "investment" && <span style={{ fontSize: 9, color: "#388bfd", background: "rgba(56,139,253,0.12)", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>↗ invest</span>}
                                  {ctype === "fixed" && <span style={{ fontSize: 9, color: C.textLo, background: C.bgInset, padding: "1px 6px", borderRadius: 4, fontWeight: 600, border: `1px solid ${C.border}` }}>fixed</span>}
                                  {status !== "ok" && ctype === "expense" && <span style={{ fontSize: 10, color: sc.color, fontWeight: 800 }}>{sc.icon}</span>}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: ctype === "investment" ? "#388bfd" : C.textMid, fontFamily: "'DM Mono',monospace" }}>{fmt(byCategory[c] || 0)}</span>
                                  <span style={{ fontSize: 11, color: C.textLo, fontFamily: "'DM Mono',monospace" }}>/ {fmt(budgets[c])}</span>
                                  <span style={{ color: C.textLo }}>›</span>
                                </div>
                              </div>
                            );
                          })}
                          <div style={{ marginTop: 14, padding: "12px 14px", background: C.bgInset, borderRadius: 10, border: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 12, color: C.textLo, fontWeight: 600 }}>Total budget</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: C.sand, fontFamily: "'DM Mono',monospace" }}>{fmt(totalBudget)} / month</span>
                          </div>
                        </div>
                      </Section>

                      <Section title={`Members · ${members.length}/${MAX_MEMBERS}`} open={settingsMembersOpen} onToggle={() => setSettingsMembersOpen(v => !v)}
                        action={<button onClick={openNewMember} style={{ background: C.bgInset, border: `1px solid ${C.border}`, borderRadius: 8, color: C.sand, fontSize: 12, fontWeight: 600, padding: "6px 12px", cursor: "pointer", fontFamily: "'Sora',sans-serif", opacity: members.length >= MAX_MEMBERS ? 0.4 : 1 }}>+ Add</button>}>
                        <div style={{ paddingTop: 12 }}>
                          <div style={{ background: C.borderMid, borderRadius: 999, height: 3, overflow: "hidden", marginBottom: 14 }}>
                            <div style={{ width: `${(members.length / MAX_MEMBERS) * 100}%`, height: "100%", background: C.accent, borderRadius: 999, transition: "width 0.4s" }} />
                          </div>
                          {members.map(m => (
                            <div key={m.name} onClick={() => openEditMember(m.name)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 8px", borderBottom: `1px solid ${C.borderMid}`, cursor: "pointer", borderRadius: 8, transition: "background 0.12s" }} onMouseEnter={e => e.currentTarget.style.background = C.bgInset} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                              <div style={{ width: 34, height: 34, borderRadius: 9, background: m.color + "25", border: `1.5px solid ${m.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: m.color, flexShrink: 0 }}>{m.name[0]}</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: C.textHi }}>{m.name}</div>
                                <div style={{ fontSize: 10, color: C.textLo, marginTop: 2, fontFamily: "'DM Mono',monospace", letterSpacing: 0.5 }}>{m.role}</div>
                              </div>
                              <div style={{ fontSize: 11, color: C.textLo }}>edit →</div>
                            </div>
                          ))}
                        </div>
                      </Section>

                      {/* Appearance */}
                      <div className="card" style={{ marginBottom: 14 }}>
                        <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: C.textHi }}>Appearance</div>
                            <div style={{ fontSize: 11, color: C.textLo, marginTop: 3 }}>{theme === "dark" ? "Dark mode" : "Light mode"}</div>
                          </div>
                          <button onClick={toggleTheme} style={{ background: C.accentDim, border: `1px solid ${C.accent}`, borderRadius: 999, padding: "7px 16px", color: C.accent, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Sora',sans-serif" }}>
                            {theme === "dark" ? "☀️ Light mode" : "🌙 Dark mode"}
                          </button>
                        </div>
                      </div>

                    </div>

                    {/* Member edit modal */}
                    {editMember !== null && (
                      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
                        <div className="card" style={{ width: "100%", maxWidth: 380, padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: C.textHi }}>{editMember === "new" ? "Add Member" : `Edit ${editMember}`}</div>
                          <div><FL>Name</FL><input className="inp" value={memberForm.name} onChange={e => setMemberForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Jordan" /></div>
                          <div><FL>Role</FL>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {[
                                { value: "owner", label: "Owner", desc: "Full access — edit budgets, members, all data" },
                                { value: "contributor", label: "Contributor", desc: "Can log entries and view the dashboard" },
                                { value: "viewer", label: "Viewer", desc: "Read-only access" },
                              ].map(opt => (
                                <div key={opt.value} onClick={() => setMemberForm(f => ({ ...f, role: opt.value }))} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, cursor: "pointer", background: memberForm.role === opt.value ? C.accentDim : C.bgInset, border: `1px solid ${memberForm.role === opt.value ? C.accent : C.border}`, transition: "all 0.15s" }}>
                                  <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${memberForm.role === opt.value ? C.accent : C.textLo}`, background: memberForm.role === opt.value ? C.accent : "transparent", flexShrink: 0, transition: "all 0.15s" }} />
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: memberForm.role === opt.value ? C.textHi : C.textMid }}>{opt.label}</div>
                                    <div style={{ fontSize: 11, color: C.textLo, marginTop: 1 }}>{opt.desc}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div><FL>Color</FL>
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                              {MEMBER_COLOR_PALETTE.map(col => (<div key={col} onClick={() => setMemberForm(f => ({ ...f, color: col }))} style={{ width: 32, height: 32, borderRadius: 8, background: col, cursor: "pointer", border: memberForm.color === col ? "3px solid #fff" : "3px solid transparent", boxShadow: memberForm.color === col ? `0 0 0 1px ${col}` : "none", transition: "all 0.15s" }} />))}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: C.bgInset, border: `1px solid ${C.border}` }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: memberForm.color + "25", border: `1.5px solid ${memberForm.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: memberForm.color }}>{memberForm.name ? memberForm.name[0].toUpperCase() : "?"}</div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: C.textHi }}>{memberForm.name || "Name"}</div>
                              <div style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace" }}>{memberForm.role}</div>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 10 }}>
                            <button className="cta" onClick={saveMember} style={{ flex: 1 }}>Save</button>
                            <button onClick={() => setEditMember(null)} style={{ flex: 1, background: C.bgInset, border: `1px solid ${C.border}`, borderRadius: 10, color: C.textMid, fontSize: 13, cursor: "pointer", fontFamily: "'Sora',sans-serif" }}>Cancel</button>
                          </div>
                          {editMember !== "new" && members.length > 1 && (
                            <button onClick={() => { if (confirm(`Remove ${editMember}?`)) deleteMember(editMember); }} style={{ background: "none", border: "none", color: "#f85149", fontSize: 12, cursor: "pointer", textAlign: "center", fontFamily: "'Sora',sans-serif" }}>Remove member</button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* LONG TERM */}
              {view === "longterm" && (() => {
                const monthsBetween = (startStr, endStr) => {
                  if (!startStr || !endStr) return null;
                  const [sy, sm] = startStr.split('-').map(Number);
                  const [ey, em] = endStr.split('-').map(Number);
                  return (ey - sy) * 12 + (em - sm);
                };
                const nowStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
                const investmentProjection = (currentValue, monthly, monthsLeft, annualRate = 0.07) => {
                  if (monthsLeft <= 0) return currentValue;
                  const r = annualRate / 12;
                  const fvLump = currentValue * Math.pow(1 + r, monthsLeft);
                  const fvPmt = monthly > 0 ? monthly * ((Math.pow(1 + r, monthsLeft) - 1) / r) : 0;
                  return fvLump + fvPmt;
                };
                const requiredMonthlyInvestment = (currentValue, goal, monthsLeft, annualRate = 0.07) => {
                  if (monthsLeft <= 0) return 0;
                  const r = annualRate / 12;
                  const fvLump = currentValue * Math.pow(1 + r, monthsLeft);
                  const remaining = goal - fvLump;
                  if (remaining <= 0) return 0;
                  return remaining / ((Math.pow(1 + r, monthsLeft) - 1) / r);
                };
                const requiredMonthlyFixed = (remaining, monthsLeft) => monthsLeft > 0 ? remaining / monthsLeft : 0;
                const totalNetWorth = longTerm.reduce((s, item) => s + (item.type === 'debt' ? -item.saved : item.saved), 0);

                const buildGoalsOutlook = () => {
                  if (longTerm.length === 0) return null;
                  const sentences = [];
                  const goalInsights = longTerm.map(item => {
                    const type = item.type || 'fixed';
                    const isDebt = type === 'debt';
                    const isInv = type === 'investment';
                    const done = isDebt ? item.saved <= 0 : item.saved >= item.goal;
                    if (done) return { name: item.name, onTrack: true, done: true };
                    const monthly = item.monthlyContribution || 0;
                    const monthsLeft = monthsBetween(nowStr, item.targetDate);
                    if (isInv && monthsLeft > 0) {
                      const projVal = investmentProjection(item.saved, monthly, monthsLeft);
                      const reqMonthly = requiredMonthlyInvestment(item.saved, item.goal, monthsLeft);
                      return { name: item.name, type, onTrack: projVal >= item.goal, projVal, reqMonthly, monthly, monthsLeft, goal: item.goal };
                    }
                    if (monthsLeft > 0) {
                      const remaining = isDebt ? item.saved : Math.max(item.goal - item.saved, 0);
                      const reqMonthly = requiredMonthlyFixed(remaining, monthsLeft);
                      const projSaved = item.saved + (isDebt ? -(monthly * monthsLeft) : (monthly * monthsLeft));
                      const onTrack = isDebt ? projSaved <= 0 : projSaved >= item.goal;
                      const monthsAtPace = monthly > 0 ? Math.ceil(remaining / monthly) : null;
                      return { name: item.name, type, onTrack, reqMonthly, monthly, monthsLeft, monthsAtPace, remaining };
                    }
                    return { name: item.name, type, onTrack: true };
                  });
                  const onTrackCount = goalInsights.filter(g => g.onTrack).length;
                  const offTrack = goalInsights.filter(g => !g.onTrack);
                  const total = goalInsights.length;
                  if (onTrackCount === total) sentences.push(`All ${total} of your long-term goals are on track — great position to be in.`);
                  else if (onTrackCount === 0) sentences.push(`None of your current goals are fully on track, but small increases to monthly contributions would make a meaningful difference.`);
                  else sentences.push(`${onTrackCount} of your ${total} goals are on track. ${offTrack[0].name} needs the most attention.`);
                  offTrack.slice(0, 3).forEach(g => {
                    if (g.type === 'investment') {
                      if (g.monthly > 0) sentences.push(`${g.name} is projected to reach ${fmt(Math.round(g.projVal))} by your target — ${fmt(Math.round(g.goal - g.projVal))} short. Increasing contributions to ${fmt(Math.round(g.reqMonthly))}/month would close the gap.`);
                      else sentences.push(`${g.name} has no monthly contribution set — add one to see what you're on track to reach.`);
                    } else if (g.type === 'debt') {
                      if (g.monthly > 0 && g.monthsLeft > 0) sentences.push(`${g.name} won't be fully paid off by your target date at the current rate. An extra ${fmt(Math.round(g.reqMonthly - g.monthly))}/month in payments would get you there.`);
                      else if (g.monthsAtPace) sentences.push(`${g.name} will be paid off in approximately ${g.monthsAtPace} months at the current rate.`);
                    } else {
                      if (g.monthly > 0 && g.monthsLeft > 0) {
                        const behindMonths = g.monthsAtPace ? g.monthsAtPace - g.monthsLeft : null;
                        if (behindMonths && behindMonths > 0) sentences.push(`${g.name} is pacing about ${behindMonths} month${behindMonths > 1 ? 's' : ''} behind. Bumping contributions from ${fmt(g.monthly)} to ${fmt(Math.round(g.reqMonthly))}/month would put you back on schedule.`);
                        else sentences.push(`${g.name} needs ${fmt(Math.round(g.reqMonthly))}/month to hit its target — you're currently contributing ${fmt(g.monthly)}/month.`);
                      } else if (!g.monthly) sentences.push(`${g.name} has no monthly contribution set — add one to see your projected timeline.`);
                    }
                  });
                  return sentences.join(' ');
                };
                const goalsOutlook = buildGoalsOutlook();

                return (
                  <div className="fu">
                    <div className="card" style={{ marginBottom: 16, overflow: "hidden" }}>
                      <div onClick={() => setNwOpen(v => !v)} style={{ padding: isDesktop ? "18px 28px" : "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 1.5 }}>NET WORTH</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: C.textHi, fontFamily: "'DM Mono',monospace", letterSpacing: -0.5 }}>${Math.round(totalNetWorth).toLocaleString("en-US")}</div>
                        </div>
                        <span style={{ fontSize: 10, color: C.textLo, transform: nwOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", display: "inline-block" }}>▼</span>
                      </div>
                      {nwOpen && (
                        <div style={{ padding: isDesktop ? "0 28px 20px" : "0 18px 16px", borderTop: `1px solid ${C.borderMid}`, paddingTop: 16 }}>
                          {netWorth.length === 0
                            ? <div style={{ fontSize: 11, color: C.textLo }}>Snapshots will appear here once the weekly trigger runs.</div>
                            : <NetWorthChart data={netWorth} isDesktop={isDesktop} />}
                        </div>
                      )}
                    </div>

                    {goalsOutlook && (
                      <div className="card" style={{ padding: isDesktop ? "18px 24px" : "16px 18px", marginBottom: 16, borderLeft: `3px solid ${C.accent}` }}>
                        <div style={{ fontSize: 10, color: C.accent, fontFamily: "'DM Mono',monospace", letterSpacing: 1.5, marginBottom: 10 }}>GOALS OUTLOOK</div>
                        <div style={{ fontSize: isDesktop ? 14 : 13, color: C.textMid, lineHeight: 1.7, overflow: "hidden", display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: isDesktop || expandedGoalsOutlook ? 999 : 5 }}>{goalsOutlook}</div>
                        {!isDesktop && goalsOutlook.length > 200 && (
                          <button onClick={() => setExpandedGoalsOutlook(v => !v)} style={{ marginTop: 8, background: "none", border: "none", color: C.accent, fontSize: 12, cursor: "pointer", fontFamily: "'Sora',sans-serif", padding: 0 }}>
                            {expandedGoalsOutlook ? "show less ↑" : "read full outlook ↓"}
                          </button>
                        )}
                      </div>
                    )}

                    {longTerm.length === 0
                      ? <div style={{ textAlign: "center", padding: "60px 0", color: C.textLo, fontSize: 13 }}>No goals yet.</div>
                      : (
                        <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : "1fr", gap: 14 }}>
                          {longTerm.map((item, i) => {
                            const color = ltColor(item, i);
                            const type = item.type || 'fixed';
                            const isDebt = type === 'debt';
                            const isInv = type === 'investment';
                            const done = isDebt ? item.saved <= 0 : item.saved >= item.goal;
                            const pct = item.goal > 0 ? Math.min(isDebt ? 1 - (item.saved / item.goal) : item.saved / item.goal, 1) : 0;
                            const remaining = isDebt ? item.saved : Math.max(item.goal - item.saved, 0);
                            const monthsLeft = monthsBetween(nowStr, item.targetDate);
                            const monthsElapsed = item.startDate ? monthsBetween(item.startDate, nowStr) : null;
                            const totalMonths = (item.startDate && item.targetDate) ? monthsBetween(item.startDate, item.targetDate) : null;
                            const pacingPct = totalMonths > 0 && monthsElapsed !== null ? Math.min(monthsElapsed / totalMonths, 0.98) : null;
                            const monthly = item.monthlyContribution || 0;
                            let insight = null;
                            if (!done && monthsLeft !== null && monthsLeft > 0) {
                              if (isInv) {
                                const projVal = investmentProjection(item.saved, monthly, monthsLeft);
                                const reqMonthly = requiredMonthlyInvestment(item.saved, item.goal, monthsLeft);
                                if (monthly > 0) { if (projVal >= item.goal) insight = { text: `On track · projected ${fmt(Math.round(projVal))} by target`, ok: true }; else insight = { text: `Need ${fmt(Math.round(reqMonthly))}/mo to hit goal · currently ${fmt(monthly)}/mo`, ok: false }; }
                                else insight = { text: `Add monthly contribution to see projection`, ok: null };
                              } else {
                                const req = requiredMonthlyFixed(remaining, monthsLeft);
                                if (monthly > 0) { const pace = monthly >= req; const months = Math.ceil(remaining / monthly); insight = { text: pace ? `On track · ${months} months at current pace` : `Need ${fmt(Math.round(req))}/mo · currently ${fmt(monthly)}/mo`, ok: pace }; }
                                else insight = { text: `${fmt(Math.round(req))}/mo needed to hit ${item.targetDate ? new Date(item.targetDate+'-01').toLocaleDateString('en-US',{month:'short',year:'numeric'}) : 'target'}`, ok: null };
                              }
                            }
                            const typeBadge = { fixed: { label: 'savings', color: '#3fb950' }, investment: { label: '↗ invest', color: '#388bfd' }, debt: { label: 'debt ↓', color: '#f97316' } }[type];
                            return (
                              <div key={i} className="lt-card" onClick={e => { if (!e.defaultPrevented) openEditLT(i); }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: C.textHi, marginBottom: 4 }}>{item.name}</div>
                                    <span style={{ fontSize: 9, color: typeBadge.color, background: typeBadge.color + '18', padding: '2px 7px', borderRadius: 4, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{typeBadge.label}</span>
                                  </div>
                                  <span style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace" }}>edit ›</span>
                                </div>
                                {done ? (
                                  <div style={{ background: color + '18', border: `1px solid ${color}35`, borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 3 }}>{isDebt ? '🎉 Paid off!' : '🎉 Goal reached!'}</div>
                                    <div style={{ fontSize: 11, color: C.textMid }}>Great work — redirect funds toward your next goal.</div>
                                  </div>
                                ) : (
                                  <>
                                    <div style={{ display: 'flex', gap: 14, marginBottom: 10 }}>
                                      <div>
                                        <div style={{ fontSize: 9, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 1, marginBottom: 2 }}>{isDebt ? 'REMAINING' : 'SAVED'}</div>
                                        <div style={{ fontSize: 17, fontWeight: 800, color, fontFamily: "'DM Mono',monospace", letterSpacing: -0.5 }}>{fmt(item.saved)}</div>
                                      </div>
                                      <div>
                                        <div style={{ fontSize: 9, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 1, marginBottom: 2 }}>{isDebt ? 'ORIGINAL' : 'GOAL'}</div>
                                        <div style={{ fontSize: 17, fontWeight: 700, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: -0.5 }}>{fmt(item.goal)}</div>
                                      </div>
                                      {item.targetDate && (
                                        <div>
                                          <div style={{ fontSize: 9, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 1, marginBottom: 2 }}>TARGET</div>
                                          <div style={{ fontSize: 13, fontWeight: 600, color: C.textMid, fontFamily: "'DM Mono',monospace" }}>{new Date(item.targetDate+'-01').toLocaleDateString('en-US',{month:'short',year:'numeric'})}</div>
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ background: C.borderMid, borderRadius: 999, height: 4, position: 'relative', marginBottom: 6 }}>
                                      <div style={{ width: `${pct * 100}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.5s' }} />
                                      {pacingPct !== null && <div style={{ position: 'absolute', top: -3, bottom: -3, left: `${pacingPct * 100}%`, width: 2, background: 'rgba(255,255,255,0.4)', borderRadius: 1, transform: 'translateX(-50%)' }} />}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                      <span style={{ fontSize: 9, color: C.textLo, fontFamily: "'DM Mono',monospace" }}>{Math.round(pct * 100)}% {isDebt ? 'paid' : 'saved'}</span>
                                      {pacingPct !== null && <span style={{ fontSize: 9, color: C.textLo, fontFamily: "'DM Mono',monospace" }}>│ expected today</span>}
                                    </div>
                                    {insight && (
                                      <div style={{ fontSize: 11, color: insight.ok === true ? '#3fb950' : insight.ok === false ? '#f85149' : C.textLo, background: insight.ok === true ? 'rgba(63,185,80,0.08)' : insight.ok === false ? 'rgba(248,81,73,0.08)' : C.bgInset, padding: '7px 10px', borderRadius: 7, fontFamily: "'DM Mono',monospace" }}>
                                        {insight.text}
                                      </div>
                                    )}
                                    {monthsLeft > 0 && (
                                      <button onClick={e => { e.preventDefault(); e.stopPropagation(); setWhatIfOpen(prev => ({ ...prev, [i]: prev[i] !== undefined ? undefined : (item.monthlyContribution || 0) })); }}
                                        style={{ marginTop: 10, background: 'none', border: `1px solid ${whatIfOpen[i] !== undefined ? C.accent : C.border}`, borderRadius: 6, color: whatIfOpen[i] !== undefined ? C.accent : C.textLo, fontSize: 10, fontFamily: "'DM Mono',monospace", padding: '4px 10px', cursor: 'pointer', letterSpacing: 0.5, transition: 'color 0.15s, border-color 0.15s' }}>
                                        {whatIfOpen[i] !== undefined ? 'close what if ↑' : 'what if? →'}
                                      </button>
                                    )}
                                    {whatIfOpen[i] !== undefined && monthsLeft > 0 && (() => {
                                      const wiMonthly = whatIfOpen[i];
                                      const maxSlider = Math.max((item.monthlyContribution || 0) * 3, 500, Math.ceil((isInv ? requiredMonthlyInvestment(item.saved, item.goal, monthsLeft) : requiredMonthlyFixed(isDebt ? item.saved : Math.max(item.goal - item.saved, 0), monthsLeft)) * 2));
                                      let wiResult = null;
                                      if (isInv) {
                                        const wiProj = investmentProjection(item.saved, wiMonthly, monthsLeft);
                                        const onTrack = wiProj >= item.goal;
                                        const d = wiProj - item.goal;
                                        wiResult = { label: `projected ${fmt(Math.round(wiProj))} by target`, ok: onTrack, sub: onTrack ? `${fmt(Math.round(d))} above goal` : `${fmt(Math.round(Math.abs(d)))} short of goal` };
                                      } else {
                                        const rem = isDebt ? item.saved : Math.max(item.goal - item.saved, 0);
                                        const wiMonthsNeeded = wiMonthly > 0 ? Math.ceil(rem / wiMonthly) : null;
                                        const onTrack = wiMonthsNeeded !== null && wiMonthsNeeded <= monthsLeft;
                                        const goalVerb = isDebt ? 'paid off' : 'goal reached';
                                        const spareLabel = isDebt ? 'to spare' : 'ahead of target';
                                        wiResult = wiMonthsNeeded
                                          ? { label: `${goalVerb} in ${wiMonthsNeeded} month${wiMonthsNeeded !== 1 ? 's' : ''}`, ok: onTrack, sub: onTrack ? `${monthsLeft - wiMonthsNeeded} month${monthsLeft - wiMonthsNeeded !== 1 ? 's' : ''} ${spareLabel}` : `${wiMonthsNeeded - monthsLeft} month${wiMonthsNeeded - monthsLeft !== 1 ? 's' : ''} past target` }
                                          : { label: 'set a contribution to project', ok: null, sub: '' };
                                      }
                                      return (
                                        <div onClick={e => e.stopPropagation()} style={{ marginTop: 12, padding: '12px 14px', background: C.bgInset, borderRadius: 10, border: `1px solid ${C.border}` }}>
                                          <div style={{ fontSize: 9, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 1.5, marginBottom: 10 }}>WHAT IF I CONTRIBUTED...</div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                            <input type="range" min={0} max={maxSlider} step={10} value={wiMonthly} onChange={e => setWhatIfOpen(prev => ({ ...prev, [i]: Number(e.target.value) }))} style={{ flex: 1, accentColor: C.accent, cursor: 'pointer' }} />
                                            <div style={{ fontSize: 14, fontWeight: 800, color: C.textHi, fontFamily: "'DM Mono',monospace", minWidth: 60, textAlign: 'right' }}>{fmt(wiMonthly)}<span style={{ fontSize: 9, color: C.textLo }}>/mo</span></div>
                                          </div>
                                          {wiResult && (
                                            <div style={{ background: wiResult.ok === true ? 'rgba(63,185,80,0.08)' : wiResult.ok === false ? 'rgba(248,81,73,0.08)' : C.bgInset, borderRadius: 7, padding: '8px 10px' }}>
                                              <div style={{ fontSize: 12, fontWeight: 600, color: wiResult.ok === true ? '#3fb950' : wiResult.ok === false ? '#f85149' : C.textLo, fontFamily: "'DM Mono',monospace", marginBottom: 2 }}>{wiResult.label}</div>
                                              {wiResult.sub && <div style={{ fontSize: 10, color: C.textLo }}>{wiResult.sub}</div>}
                                            </div>
                                          )}
                                          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                                            {[0, Math.round(maxSlider * 0.25), Math.round(maxSlider * 0.5), Math.round(maxSlider * 0.75), maxSlider].map(v => (
                                              <button key={v} onClick={() => setWhatIfOpen(prev => ({ ...prev, [i]: v }))} style={{ background: wiMonthly === v ? C.accentDim : 'none', border: `1px solid ${wiMonthly === v ? C.accent : C.border}`, borderRadius: 5, color: wiMonthly === v ? C.textHi : C.textLo, fontSize: 9, fontFamily: "'DM Mono',monospace", padding: '3px 8px', cursor: 'pointer' }}>{fmt(v)}</button>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    <div style={{ marginTop: 16, background: C.bgCard, border: `1px dashed ${C.border}`, borderRadius: 14, padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                      <div style={{ fontSize: 13, color: C.textLo }}>Add a new goal to track</div>
                      <button onClick={openNewLT} style={{ background: C.accent, border: 'none', borderRadius: 9, color: '#fff', fontSize: 12, fontWeight: 700, padding: '9px 20px', cursor: 'pointer', fontFamily: "'Sora',sans-serif", whiteSpace: 'nowrap' }}>Add Goal</button>
                    </div>
                  </div>
                );
              })()}

              {/* TRENDS */}
              {view === "trends" && (() => {
                const trendsMonths = (() => {
                  const months = [];
                  for (let i = 11; i >= 0; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    const y = d.getFullYear(), m = d.getMonth();
                    const key = `${y}-${String(m+1).padStart(2,"0")}`;
                    const label = MONTH_NAMES[m].slice(0,3) + (i === 0 || m === 0 ? ` '${String(y).slice(2)}` : "");
                    const monthEntries = allEntries.filter(e => e.date.startsWith(key));
                    const spend = monthEntries.reduce((s, e) => s + e.amount, 0);
                    const byCat = {}; categories.forEach(c => byCat[c] = 0); monthEntries.forEach(e => { if (byCat[e.category] !== undefined) byCat[e.category] += e.amount; });
                    const byMem = {}; memberNames.forEach(m => byMem[m] = 0); monthEntries.forEach(e => { if (byMem[e.member] !== undefined) byMem[e.member] += e.amount; });
                    months.push({ key, label, spend, byCat, byMem, entries: monthEntries });
                  }
                  return months;
                })();
                const selectedData = selectedTrendsMonth ? trendsMonths.find(m => m.key === selectedTrendsMonth) : null;
                const catTrends = categories.filter(c => (catTypes[c] || "expense") !== "investment").map(c => {
                  const recent = trendsMonths.slice(-3).reduce((s, m) => s + m.byCat[c], 0) / 3;
                  const prior = trendsMonths.slice(-6, -3).reduce((s, m) => s + m.byCat[c], 0) / 3;
                  const delta = prior > 0 ? (recent - prior) / prior : 0;
                  return { cat: c, recent, prior, delta };
                }).filter(c => c.recent > 0 || c.prior > 0).sort((a, b) => b.delta - a.delta);
                const trending_up = catTrends.filter(c => c.delta > 0.1).slice(0, 3);
                const trending_down = catTrends.filter(c => c.delta < -0.1).slice(0, 3);
                const monthsWithSpend = trendsMonths.filter(m => m.spend > 0);
                const avgSpend = monthsWithSpend.length > 0 ? monthsWithSpend.reduce((s, m) => s + m.spend, 0) / monthsWithSpend.length : 0;
                const bestMonth = [...trendsMonths].filter(m => m.spend > 0).sort((a, b) => a.spend - b.spend)[0];
                const worstMonth = [...trendsMonths].filter(m => m.spend > 0).sort((a, b) => b.spend - a.spend)[0];
                return (
                  <div className="fu">
                    <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : "1fr", gap: 10, marginBottom: 16 }}>
                      {[
                        { label: "12-MONTH AVG", value: fmt(Math.round(avgSpend)), sub: "monthly spend" },
                        { label: "BEST MONTH", value: bestMonth ? MONTH_NAMES[parseInt(bestMonth.key.slice(5,7))-1].slice(0,3) + " " + bestMonth.key.slice(0,4) : "—", sub: bestMonth ? fmt(bestMonth.spend) + " spent" : "no data", color: "#3fb950" },
                        { label: "HIGHEST MONTH", value: worstMonth ? MONTH_NAMES[parseInt(worstMonth.key.slice(5,7))-1].slice(0,3) + " " + worstMonth.key.slice(0,4) : "—", sub: worstMonth ? fmt(worstMonth.spend) + " spent" : "no data", color: "#f85149" },
                      ].map(({ label, value, sub, color }) => (
                        <div key={label} className="card" style={{ padding: "14px 16px" }}>
                          <div style={{ fontSize: 9, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 1.5, marginBottom: 6 }}>{label}</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: color || C.textHi, fontFamily: "'DM Mono',monospace", letterSpacing: -0.5, lineHeight: 1, marginBottom: 4 }}>{value}</div>
                          <div style={{ fontSize: 11, color: C.textLo }}>{sub}</div>
                        </div>
                      ))}
                    </div>
                    <div className="card" style={{ padding: isDesktop ? "20px 24px" : "16px 14px", marginBottom: 16, overflowX: "auto" }}>
                      <div style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 1.5, marginBottom: 14 }}>MONTHLY SPEND — LAST 12 MONTHS<span style={{ marginLeft: 10, color: C.borderMid }}>· tap a bar to inspect</span></div>
                      <TrendsChart monthData={trendsMonths} totalBudget={totalBudget} isDesktop={isDesktop} onSelectMonth={setSelectedTrendsMonth} selectedMonth={selectedTrendsMonth} />
                    </div>
                    {selectedData && (
                      <div className="card" style={{ padding: isDesktop ? "20px 24px" : "16px 14px", marginBottom: 16, borderLeft: `3px solid ${C.accent}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                          <div style={{ fontSize: 10, color: C.accent, fontFamily: "'DM Mono',monospace", letterSpacing: 1.5 }}>{MONTH_NAMES[parseInt(selectedData.key.slice(5,7))-1].toUpperCase()} {selectedData.key.slice(0,4)}</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: selectedData.spend > totalBudget + 2 ? "#f85149" : "#3fb950", fontFamily: "'DM Mono',monospace" }}>{fmt(selectedData.spend)}</div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {categories.filter(c => selectedData.byCat[c] > 0).sort((a, b) => selectedData.byCat[b] - selectedData.byCat[a]).map(c => {
                            const spent = selectedData.byCat[c];
                            const budget = budgets[c] || 0;
                            const pct = budget > 0 ? Math.min(spent / budget, 1.5) : 0;
                            const over = spent > budget + 2;
                            return (
                              <div key={c}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 6, height: 6, borderRadius: 2, background: catColors[c] || C.textLo, flexShrink: 0 }} /><span style={{ fontSize: 12, color: C.textMid }}>{c}</span></div>
                                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{budget > 0 && <span style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace" }}>/ {fmt(budget)}</span>}<span style={{ fontSize: 12, fontWeight: 700, color: over ? "#f85149" : C.textHi, fontFamily: "'DM Mono',monospace" }}>{fmt(spent)}</span></div>
                                </div>
                                {budget > 0 && (<div style={{ background: C.borderMid, borderRadius: 999, height: 3, overflow: "hidden" }}><div style={{ width: `${Math.min(pct * 100, 100)}%`, height: "100%", background: over ? "#f85149" : catColors[c] || C.accent, borderRadius: 999 }} /></div>)}
                              </div>
                            );
                          })}
                          {memberNames.length > 1 && (
                            <div style={{ display: "flex", gap: 16, marginTop: 8, paddingTop: 10, borderTop: `1px solid ${C.borderMid}` }}>
                              {memberNames.map(m => (
                                <div key={m} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: memberColors[m], flexShrink: 0 }} />
                                  <span style={{ fontSize: 11, color: C.textMid }}>{m}</span>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: memberColors[m], fontFamily: "'DM Mono',monospace" }}>{fmt(selectedData.byMem[m] || 0)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {(trending_up.length > 0 || trending_down.length > 0) && (
                      <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", gap: 14 }}>
                        {trending_up.length > 0 && (
                          <div className="card" style={{ padding: "18px 20px" }}>
                            <div style={{ fontSize: 10, color: "#f85149", fontFamily: "'DM Mono',monospace", letterSpacing: 1.5, marginBottom: 4 }}>TRENDING UP</div>
                            <div style={{ fontSize: 11, color: C.textLo, marginBottom: 12 }}>Higher spend vs 3 months prior</div>
                            {trending_up.map(({ cat, recent, delta }) => (
                              <div key={cat} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.borderMid}` }}>
                                <div style={{ width: 6, height: 6, borderRadius: 2, background: catColors[cat] || C.textLo, flexShrink: 0 }} />
                                <span style={{ flex: 1, fontSize: 12, color: C.textMid }}>{cat}</span>
                                <span style={{ fontSize: 11, color: "#f85149", fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>+{Math.round(delta * 100)}%</span>
                                <span style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace" }}>{fmt(Math.round(recent))}/mo avg</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {trending_down.length > 0 && (
                          <div className="card" style={{ padding: "18px 20px" }}>
                            <div style={{ fontSize: 10, color: "#3fb950", fontFamily: "'DM Mono',monospace", letterSpacing: 1.5, marginBottom: 4 }}>TRENDING DOWN</div>
                            <div style={{ fontSize: 11, color: C.textLo, marginBottom: 12 }}>Lower spend vs 3 months prior</div>
                            {trending_down.map(({ cat, recent, delta }) => (
                              <div key={cat} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.borderMid}` }}>
                                <div style={{ width: 6, height: 6, borderRadius: 2, background: catColors[cat] || C.textLo, flexShrink: 0 }} />
                                <span style={{ flex: 1, fontSize: 12, color: C.textMid }}>{cat}</span>
                                <span style={{ fontSize: 11, color: "#3fb950", fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{Math.round(delta * 100)}%</span>
                                <span style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace" }}>{fmt(Math.round(recent))}/mo avg</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* REVIEW */}
              {view === "review" && (() => {
                const revYear = viewYear, revMonth = viewMonth;
                const prevRevMonth = revMonth === 0 ? 11 : revMonth - 1;
                const prevRevYear = revMonth === 0 ? revYear - 1 : revYear;
                const revPrefix = `${revYear}-${String(revMonth + 1).padStart(2, "0")}`;
                const prevPrefix = `${prevRevYear}-${String(prevRevMonth + 1).padStart(2, "0")}`;
                const revEntries = allEntries.filter(e => e.date.startsWith(revPrefix));
                const prevEntries = allEntries.filter(e => e.date.startsWith(prevPrefix));
                const revDays = getDaysInMonth(revYear, revMonth);
                const revToday = isCurrentMonth ? now.getDate() : revDays;
                const revTotal = revEntries.reduce((s, e) => s + e.amount, 0);
                const prevTotal = prevEntries.reduce((s, e) => s + e.amount, 0);
                const revBudget = Object.values(budgets).reduce((s, v) => s + v, 0);
                const revDiff = revBudget - revTotal;
                const momDelta = prevTotal > 0 ? revTotal - prevTotal : null;
                const revByCat = {}, prevByCat = {};
                categories.forEach(c => { revByCat[c] = 0; prevByCat[c] = 0; });
                revEntries.forEach(e => { if (revByCat[e.category] !== undefined) revByCat[e.category] += e.amount; });
                prevEntries.forEach(e => { if (prevByCat[e.category] !== undefined) prevByCat[e.category] += e.amount; });
                const alertableCats = categories.filter(c => (catTypes[c] || "expense") !== "investment");
                const catsWithSpend = alertableCats.filter(c => revByCat[c] > 0 || budgets[c] > 0);
                const catPct = c => budgets[c] > 0 ? revByCat[c] / budgets[c] : 0;
                const sorted = [...catsWithSpend].sort((a, b) => catPct(b) - catPct(a));
                const worst = sorted.slice(0, 3);
                const best = [...catsWithSpend].filter(c => revByCat[c] > 0).sort((a, b) => catPct(a) - catPct(b)).slice(0, 3);
                const topEntries = [...revEntries].sort((a, b) => b.amount - a.amount).slice(0, 5);
                const revByMember = {};
                memberNames.forEach(m => revByMember[m] = 0);
                revEntries.forEach(e => { if (revByMember[e.member] !== undefined) revByMember[e.member] += e.amount; });
                const isFinal = !isCurrentMonth && !isFutureMonth;
                const progress = revToday / revDays;

                const buildSummary = () => {
                  const sentences = [];
                  const monthName = MONTH_NAMES[revMonth];
                  const prevMonthName = MONTH_NAMES[prevRevMonth];
                  const underPct = revBudget > 0 ? revDiff / revBudget : 0;
                  if (isFinal) {
                    if (revDiff < -2) sentences.push(`${monthName} was a tough month — you came in ${fmt(Math.abs(revDiff))} over budget.`);
                    else if (underPct > 0.2) sentences.push(`${monthName} was a strong month — you finished ${fmt(revDiff)} under budget, one of your better margins.`);
                    else if (underPct > 0.1) sentences.push(`${monthName} was a solid month — you came in ${fmt(revDiff)} under budget.`);
                    else sentences.push(`${monthName} was a close one — you finished just ${fmt(revDiff)} under budget.`);
                  } else {
                    const spendPct = revBudget > 0 ? revTotal / revBudget : 0;
                    if (spendPct > progress + 0.1) sentences.push(`You're ${Math.round(progress * 100)}% through ${monthName} and spend is running ahead of pace — ${fmt(revTotal)} logged so far against a ${fmt(revBudget)} budget.`);
                    else sentences.push(`You're ${Math.round(progress * 100)}% through ${monthName} with ${fmt(revTotal)} logged — tracking ${fmt(revDiff)} under budget so far.`);
                  }
                  if (momDelta !== null && prevTotal > 0) {
                    const absDelta = Math.abs(momDelta);
                    if (momDelta < -10) sentences.push(`That's ${fmt(absDelta)} less than ${prevMonthName}, which is encouraging.`);
                    else if (momDelta > 10) sentences.push(`That's ${fmt(absDelta)} more than ${prevMonthName}.`);
                    else sentences.push(`Spend is running at a similar level to ${prevMonthName}.`);
                  }
                  if (worst.length > 0) {
                    const c = worst[0]; const spent = revByCat[c] || 0; const budget = budgets[c] || 0; const pct = budget > 0 ? spent / budget : 0;
                    if (spent > budget + 2) sentences.push(`${c} was your biggest pressure point, coming in at ${fmt(spent)} against a ${fmt(budget)} budget.`);
                    else if (pct > 0.85) sentences.push(`${c} ran close to its limit at ${Math.round(pct * 100)}% of budget.`);
                    else if (pct > 0.5) sentences.push(`${c} was your highest usage category at ${Math.round(pct * 100)}% of budget, though still within range.`);
                  }
                  if (best.length > 0) { const c = best[0]; const spent = revByCat[c] || 0; const budget = budgets[c] || 0; if (spent > 0 && budget > 0) sentences.push(`On the other end, ${c} came in well under at ${fmt(spent)} of its ${fmt(budget)} budget.`); }
                  if (topEntries.length > 0) { const e = topEntries[0]; const noteStr = e.notes ? ` (${e.notes})` : ""; sentences.push(`Your largest single spend was ${fmtD(e.amount)} on ${e.category}${noteStr}.`); }
                  if (memberNames.length >= 2 && revTotal > 0) {
                    const srt = [...memberNames].sort((a, b) => (revByMember[b] || 0) - (revByMember[a] || 0));
                    const top = srt[0], second = srt[1];
                    const topAmt = revByMember[top] || 0, secAmt = revByMember[second] || 0;
                    if (topAmt > 0 && secAmt > 0) {
                      const splitPct = (topAmt - secAmt) / revTotal;
                      if (splitPct < 0.05) sentences.push(`${top} and ${second} spent about the same — ${fmt(topAmt)} and ${fmt(secAmt)} respectively.`);
                      else if (splitPct < 0.15) sentences.push(`${top} drove slightly more of the spend at ${fmt(topAmt)} versus ${fmt(secAmt)} for ${second}.`);
                      else sentences.push(`There was a notable difference in spend — ${top} accounted for ${fmt(topAmt)} compared to ${fmt(secAmt)} for ${second}.`);
                    }
                  }
                  if (!isFinal && projection) {
                    if (projection.projectedOver) sentences.push(`At current pace you're on track to finish around ${fmt(projection.projectedSpend)} — worth keeping an eye on${worst[0] ? ` ${worst[0]}` : " spending"}.`);
                    else sentences.push(`At current pace you'll finish the month around ${fmt(projection.projectedSpend)}, well within budget.`);
                  }
                  return sentences.join(" ");
                };
                const summaryText = buildSummary();

                const StatTile = ({ label, value, sub, color }) => (
                  <div style={{ background: C.bgInset, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", flex: 1, minWidth: 100 }}>
                    <div style={{ fontSize: 9, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 1.5, marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: color || C.textHi, fontFamily: "'DM Mono',monospace", letterSpacing: -0.5, lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
                    {sub && <div style={{ fontSize: 10, color: C.textLo, marginTop: 5 }}>{sub}</div>}
                  </div>
                );

                const CatRow = ({ c, rank }) => {
                  const spent = revByCat[c] || 0; const budget = budgets[c] || 0;
                  const pct = budget > 0 ? Math.min(spent / budget, 1.5) : 0;
                  const over = spent > budget + 2;
                  const color = catColors[c] || C.textMid;
                  const prevSpent = prevByCat[c] || 0;
                  const delta = prevSpent > 0 ? spent - prevSpent : null;
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.borderMid}` }}>
                      <div style={{ width: 20, fontSize: 11, color: C.textLo, fontFamily: "'DM Mono',monospace", flexShrink: 0, textAlign: "center" }}>{rank}</div>
                      <div style={{ width: 6, height: 6, borderRadius: 2, background: color, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: C.textMid, fontWeight: 500 }}>{truncate(c)}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {delta !== null && <span style={{ fontSize: 10, color: delta > 0 ? "#f85149" : "#3fb950", fontFamily: "'DM Mono',monospace" }}>{delta > 0 ? "+" : ""}{fmt(delta)} vs last</span>}
                            <span style={{ fontSize: 12, fontWeight: 700, color: over ? "#f85149" : C.textHi, fontFamily: "'DM Mono',monospace" }}>{fmt(spent)}</span>
                            <span style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace" }}>/ {fmt(budget)}</span>
                          </div>
                        </div>
                        <div style={{ background: C.borderMid, borderRadius: 999, height: 3, overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(pct * 100, 100)}%`, height: "100%", background: over ? "#f85149" : color, borderRadius: 999, transition: "width 0.5s" }} />
                        </div>
                      </div>
                    </div>
                  );
                };

                return (
                  <div className="fu">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                      <div>
                        <div style={{ fontSize: isDesktop ? 20 : 16, fontWeight: 800, color: C.textHi, letterSpacing: -0.5 }}>{MONTH_NAMES[revMonth]} {revYear} {isFinal ? "Review" : "· In Progress"}</div>
                        <div style={{ fontSize: 11, color: C.textLo, marginTop: 3 }}>{isFinal ? `Final · ${revDays} days` : `Day ${revToday} of ${revDays} · ${Math.round(progress * 100)}% through month`}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="month-btn" onClick={prevMonth}>← {MONTH_NAMES[prevRevMonth].slice(0,3)}</button>
                        {!isCurrentMonth && <button className="month-btn" onClick={nextMonth}>{MONTH_NAMES[viewMonth === 11 ? 0 : viewMonth + 1].slice(0,3)} →</button>}
                      </div>
                    </div>
                    {summaryText && (
                      <div className="card" style={{ padding: isDesktop ? "18px 24px" : "16px 18px", marginBottom: 16, borderLeft: `3px solid ${C.accent}` }}>
                        <div style={{ fontSize: 10, color: C.accent, fontFamily: "'DM Mono',monospace", letterSpacing: 1.5, marginBottom: 10 }}>{isFinal ? "MONTHLY SUMMARY" : "IN PROGRESS"}</div>
                        <div style={{ fontSize: isDesktop ? 14 : 13, color: C.textMid, lineHeight: 1.7, overflow: "hidden", display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: isDesktop || expandedSummary ? 999 : 5 }}>{summaryText}</div>
                        {!isDesktop && summaryText.length > 200 && (
                          <button onClick={() => setExpandedSummary(v => !v)} style={{ marginTop: 8, background: "none", border: "none", color: C.accent, fontSize: 12, cursor: "pointer", fontFamily: "'Sora',sans-serif", padding: 0 }}>
                            {expandedSummary ? "show less ↑" : "read full summary ↓"}
                          </button>
                        )}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                      <StatTile label="SPENT" value={fmt(revTotal)} sub={`of ${fmt(revBudget)} budget`} color={revTotal > revBudget + 2 ? "#f85149" : C.textHi} />
                      <StatTile label={revDiff >= 0 ? "UNDER BUDGET" : "OVER BUDGET"} value={`${revDiff >= 0 ? "+" : "−"}${fmt(Math.abs(revDiff))}`} sub={revDiff >= 0 ? "great work" : "over limit"} color={revDiff >= 0 ? "#3fb950" : "#f85149"} />
                      {momDelta !== null && <StatTile label="VS LAST MONTH" value={`${momDelta >= 0 ? "+" : "−"}${fmt(Math.abs(momDelta))}`} sub={momDelta >= 0 ? "more than " + MONTH_NAMES[prevRevMonth].slice(0,3) : "less than " + MONTH_NAMES[prevRevMonth].slice(0,3)} color={momDelta > 0 ? "#f85149" : "#3fb950"} />}
                      {memberNames.map(m => (<StatTile key={m} label={m.toUpperCase()} value={fmt(revByMember[m] || 0)} color={memberColors[m]} />))}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", gap: 14, marginBottom: 16 }}>
                      <div className="card" style={{ padding: "18px 20px" }}>
                        <div style={{ fontSize: 10, color: "#f85149", fontFamily: "'DM Mono',monospace", letterSpacing: 2, marginBottom: 4 }}>HIGHEST USAGE</div>
                        <div style={{ fontSize: 11, color: C.textLo, marginBottom: 12 }}>Categories closest to or over budget</div>
                        {worst.length === 0 ? <div style={{ fontSize: 12, color: C.textLo }}>No spend yet.</div> : worst.map((c, i) => <CatRow key={c} c={c} rank={i + 1} />)}
                      </div>
                      <div className="card" style={{ padding: "18px 20px" }}>
                        <div style={{ fontSize: 10, color: "#3fb950", fontFamily: "'DM Mono',monospace", letterSpacing: 2, marginBottom: 4 }}>LOWEST USAGE</div>
                        <div style={{ fontSize: 11, color: C.textLo, marginBottom: 12 }}>Categories with most budget remaining</div>
                        {best.length === 0 ? <div style={{ fontSize: 12, color: C.textLo }}>No spend yet.</div> : best.map((c, i) => <CatRow key={c} c={c} rank={i + 1} />)}
                      </div>
                    </div>
                    <div className="card" style={{ padding: "18px 20px", marginBottom: 16 }}>
                      <div style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 2, marginBottom: 14 }}>TOP ENTRIES THIS MONTH</div>
                      {topEntries.length === 0 ? <div style={{ fontSize: 12, color: C.textLo }}>No entries yet.</div> : topEntries.map((e, i) => (
                        <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < topEntries.length - 1 ? `1px solid ${C.borderMid}` : "none" }}>
                          <div style={{ width: 20, fontSize: 11, color: C.textLo, fontFamily: "'DM Mono',monospace", textAlign: "center", flexShrink: 0 }}>{i + 1}</div>
                          <div style={{ width: 5, height: 5, borderRadius: 1, background: catColors[e.category] || C.textLo, flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, color: C.textMid, fontWeight: 500 }}>{e.category}{e.notes ? <span style={{ color: C.textLo, fontWeight: 400 }}> · {e.notes}</span> : ""}</div>
                            <div style={{ fontSize: 10, color: C.textLo, marginTop: 2 }}>{e.date.slice(0,10)} · {e.member}</div>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: catColors[e.category] || C.textMid, fontFamily: "'DM Mono',monospace" }}>{fmtD(e.amount)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

            </>
          )}
        </div>

      </div>{/* end zIndex:1 wrapper */}
    </div>
  );
}
