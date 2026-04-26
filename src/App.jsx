import { useState, useMemo, useEffect, useCallback } from "react";

const API_URL = "https://script.google.com/macros/s/AKfycbxbNc2pXZT8AsSgXNS9mjtaGda24l3kTl3Etvex1xmMV58_SX9DynXqXItYFwBYwaqryA/exec";

const FAMILY_MEMBERS = ["Matt", "Alice"];
const PALETTE = ["#60a5fa","#f97316","#4ade80","#a78bfa","#f472b6","#34d399","#fbbf24","#94a3b8","#fb7185","#38bdf8","#c084fc","#fdba74","#86efac","#67e8f9","#fde68a","#d8b4fe"];
const MEMBER_COLORS = { "Matt": "#60a5fa", "Alice": "#f472b6" };
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const C = {
  bg:        "#0d1117",
  bgCard:    "#161b22",
  bgInset:   "#0d1117",
  border:    "#30363d",
  borderMid: "#21262d",
  textHi:    "#e6edf3",
  textMid:   "#8b949e",
  textLo:    "#6e7681",
  accent:    "#388bfd",
  accentDim: "#1f3a6e",
  sand:      "#8b949e",
  sandDim:   "#6e7681",
};

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }

function getCategoryStatus(spent, budget, dayOfMonth, daysInMonth) {
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
  ok:   { icon: "✓", color: "#4ade80" },
  warn: { icon: "↑", color: "#eab308" },
  risk: { icon: "↑", color: "#f97316" },
  over: { icon: "!", color: "#ef4444" },
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

function HeroDonut({ segments, totalSpend, totalBudget, size = 180 }) {
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
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg viewBox="0 0 180 180" style={{ width: size, height: size, transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.borderMid} strokeWidth={sw} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth={sw}
          strokeDasharray={`${Math.min(totalBudget / total, 1) * circ} ${circ}`} strokeLinecap="butt" />
        {arcs.map((arc, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={arc.color} strokeWidth={sw}
            strokeDasharray={`${arc.pct * circ - 1.5} ${circ}`}
            strokeDashoffset={-arc.offset * circ}
            strokeLinecap="butt"
            style={{ transition: "stroke-dasharray 0.7s cubic-bezier(.4,0,.2,1)" }} />
        ))}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: overBudget ? "#ef4444" : C.textHi, fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{fmt(totalSpend)}</div>
        <div style={{ fontSize: 9, color: C.textLo, fontFamily: "'DM Mono', monospace", letterSpacing: 1.5 }}>SPENT</div>
      </div>
    </div>
  );
}

function LegendItem({ color, label, value, fmt }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: C.textMid, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
        <div style={{ fontSize: 11, color, fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>{fmt(value)}</div>
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

function CategoryBar({ spent, budget, color, dayOfMonth, daysInMonth }) {
  const progress = dayOfMonth / daysInMonth;
  const pct = Math.min((spent / Math.max(budget, 0.01)) * 100, 100);
  const status = getCategoryStatus(spent, budget, dayOfMonth, daysInMonth);
  const projPct = Math.min((spent / Math.max(progress, 0.01) / Math.max(budget, 0.01)) * 100, 100);
  const barColor = status === "ok" ? color : status === "warn" ? "#eab308" : status === "risk" ? "#f97316" : "#ef4444";
  return (
    <div style={{ background: C.borderMid, borderRadius: 999, height: 4, position: "relative" }}>
      {status !== "over" && <div style={{ position: "absolute", left: 0, top: 0, width: `${projPct}%`, height: "100%", background: barColor + "35", borderRadius: 999 }} />}
      <div style={{ position: "absolute", left: 0, top: 0, width: `${pct}%`, height: "100%", background: barColor, borderRadius: 999, transition: "width 0.5s" }} />
      <div style={{ position: "absolute", top: -4, bottom: -4, left: `${progress * 100}%`, width: 1.5, background: "rgba(255,255,255,0.35)", borderRadius: 1, transform: "translateX(-50%)" }} />
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
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 80, gap: 14 }}>
      <div style={{ width: 28, height: 28, border: `2px solid ${C.border}`, borderTop: `2px solid ${C.sand}`, borderRadius: "50%", animation: "spin 0.9s linear infinite" }} />
      <div style={{ color: C.textLo, fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: 2 }}>LOADING</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const FL = ({ children }) => (
  <div style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>{children}</div>
);

export default function App() {
  const isDesktop = useIsDesktop();
  const [allEntries, setAllEntries] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [catColors, setCatColors] = useState({});
  const [longTerm, setLongTerm] = useState([]);
  const [rawSections, setRawSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState("dashboard");
  const [toast, setToast] = useState(null);
  const [nextId, setNextId] = useState(1);
  const [expandedSections, setExpandedSections] = useState({});
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [entriesOpen, setEntriesOpen] = useState(false);
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [form, setForm] = useState({ member: "", category: "", amount: "", notes: "" });
  const [editEntry, setEditEntry] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editCat, setEditCat] = useState(null);
  const [catForm, setCatForm] = useState({ name: "", budget: "", color: PALETTE[0] });
  const [editLT, setEditLT] = useState(null);
  const [ltForm, setLtForm] = useState({ name: "", saved: "", goal: "", color: PALETTE[0], targetDate: "", startDate: "" });

  const categories = useMemo(() => Object.keys(budgets), [budgets]);
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
      const bm = {}, cm = {};
      (data.budgets || []).forEach(r => { if (r[0]) { bm[String(r[0])] = parseFloat(r[1]); cm[String(r[0])] = String(r[2]); } });
      const lt = (data.longTerm || []).filter(r => r[0]).map(r => ({ name: String(r[0]), saved: parseFloat(r[1]) || 0, goal: parseFloat(r[2]) || 0, color: String(r[3] || ''), targetDate: String(r[4] || ''), startDate: String(r[5] || '') }));
      const secs = (data.sections || []).filter(r => r[0] && r[1]).map(r => ({ section: String(r[0]), category: String(r[1]), order: parseInt(r[2]) || 0 }));
      setAllEntries(entries); setBudgets(bm); setCatColors(cm); setLongTerm(lt); setRawSections(secs);
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
  const byMember = useMemo(() => { const m = {}; FAMILY_MEMBERS.forEach(n => m[n] = 0); entries.forEach(e => { m[e.member] = (m[e.member] || 0) + e.amount; }); return m; }, [entries]);
  const byCategory = useMemo(() => { const m = {}; categories.forEach(c => m[c] = 0); entries.forEach(e => { if (m[e.category] !== undefined) m[e.category] += e.amount; }); return m; }, [entries, categories]);
  const byMemberCategory = useMemo(() => { const m = {}; FAMILY_MEMBERS.forEach(n => { m[n] = {}; categories.forEach(c => { m[n][c] = 0; }); }); entries.forEach(e => { if (m[e.member] && m[e.member][e.category] !== undefined) m[e.member][e.category] += e.amount; }); return m; }, [entries, categories]);
  const categoryStatuses = useMemo(() => { const m = {}; categories.forEach(c => { m[c] = getCategoryStatus(byCategory[c] || 0, budgets[c], dayOfMonth, daysInMonth); }); return m; }, [byCategory, budgets, dayOfMonth, daysInMonth, categories]);
  const alertCount = useMemo(() => Object.values(categoryStatuses).filter(s => s !== "ok").length, [categoryStatuses]);
  const overCount = useMemo(() => Object.values(categoryStatuses).filter(s => s === "over").length, [categoryStatuses]);
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

  const sectionTotals = useMemo(() => {
    const t = {};
    sectionStructure.forEach(sec => {
      t[sec.name] = { spent: sec.cats.reduce((s, c) => s + (byCategory[c] || 0), 0), budget: sec.cats.reduce((s, c) => s + (budgets[c] || 0), 0) };
    });
    return t;
  }, [sectionStructure, byCategory, budgets]);

  const donutSegments = useMemo(() => sectionStructure.map((sec, i) => ({
    label: sec.name,
    value: sectionTotals[sec.name]?.spent || 0,
    color: sec.cats.length > 0 ? (catColors[sec.cats[0]] || PALETTE[i % PALETTE.length]) : PALETTE[i % PALETTE.length],
  })), [sectionStructure, sectionTotals, catColors]);

  const ltColor = (item, i) => item.color && item.color !== '' ? item.color : PALETTE[i % PALETTE.length];
  const diff = totalBudget - totalSpend;
  const overBudget = totalSpend > totalBudget + 2;
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
  async function saveBudgetsToSheet(nb, nc) {
    try { await api({ action: "saveBudgets", budgets: JSON.stringify(Object.keys(nb).map(c => ({ category: c, budget: nb[c], color: nc[c] || PALETTE[0] }))) }); }
    catch { showToast("Budget sync failed.", false); }
  }
  function openNewCat() { setCatForm({ name: "", budget: "", color: PALETTE.find(p => !Object.values(catColors).includes(p)) || PALETTE[0] }); setEditCat("new"); }
  function openEditCat(name) { setCatForm({ name, budget: String(budgets[name]), color: catColors[name] }); setEditCat(name); }
  async function saveCat() {
    const name = catForm.name.trim();
    if (!name || !catForm.budget || isNaN(+catForm.budget) || +catForm.budget <= 0) { showToast("Fill name and budget.", false); return; }
    let nb = { ...budgets }, nc = { ...catColors };
    if (editCat === "new") { if (budgets[name]) { showToast("Already exists.", false); return; } nb[name] = parseFloat((+catForm.budget).toFixed(2)); nc[name] = catForm.color; }
    else { if (name !== editCat && budgets[name]) { showToast("Name taken.", false); return; } if (name !== editCat) { nb[name] = nb[editCat]; delete nb[editCat]; nc[name] = nc[editCat]; delete nc[editCat]; setAllEntries(prev => prev.map(e => e.category === editCat ? { ...e, category: name } : e)); } nb[name] = parseFloat((+catForm.budget).toFixed(2)); nc[name] = catForm.color; }
    setBudgets(nb); setCatColors(nc); setEditCat(null); showToast(editCat === "new" ? `"${name}" added.` : "Updated.");
    await saveBudgetsToSheet(nb, nc);
  }
  async function deleteCat(catName) {
    if (categories.length <= 1) { showToast("Can't delete the last category.", false); return; }
    const nb = { ...budgets }; delete nb[catName]; const nc = { ...catColors }; delete nc[catName];
    setBudgets(nb); setCatColors(nc); setAllEntries(prev => prev.filter(e => e.category !== catName)); setEditCat(null); showToast(`"${catName}" deleted.`);
    await saveBudgetsToSheet(nb, nc);
  }
  function openNewLT() { setLtForm({ name: "", saved: "", goal: "", color: PALETTE[0], targetDate: "", startDate: new Date().toISOString().slice(0, 7) }); setEditLT("new"); }
  function openEditLT(i) { const it = longTerm[i]; setLtForm({ name: it.name, saved: String(it.saved), goal: String(it.goal), color: it.color || PALETTE[0], targetDate: it.targetDate || "", startDate: it.startDate || "" }); setEditLT(i); }
  async function saveLT() {
    const name = ltForm.name.trim();
    if (!name || ltForm.saved === "" || ltForm.goal === "" || isNaN(+ltForm.saved) || isNaN(+ltForm.goal)) { showToast("Fill all fields.", false); return; }
    let next = [...longTerm];
    const item = { name, saved: parseFloat((+ltForm.saved).toFixed(2)), goal: parseFloat((+ltForm.goal).toFixed(2)), color: ltForm.color || PALETTE[0], targetDate: ltForm.targetDate || "", startDate: ltForm.startDate || "" };
    if (editLT === "new") next.push(item); else next[editLT] = item;
    setLongTerm(next); setEditLT(null); showToast(editLT === "new" ? `"${name}" added.` : "Updated.");
    setSyncing(true);
    try { await api({ action: "saveLongTerm", items: JSON.stringify(next) }); }
    catch { showToast("Sync failed.", false); } finally { setSyncing(false); }
  }
  async function deleteLT(i) {
    const next = longTerm.filter((_, idx) => idx !== i);
    setLongTerm(next); setEditLT(null); showToast("Deleted.");
    setSyncing(true);
    try { await api({ action: "saveLongTerm", items: JSON.stringify(next) }); }
    catch { showToast("Sync failed.", false); } finally { setSyncing(false); }
  }

  const mw = isDesktop ? 1320 : 700;

  const MemberChips = ({ value, onChange }) => (
    <div style={{ display: "flex", gap: 8 }}>
      {FAMILY_MEMBERS.map(m => (
        <button key={m} onClick={() => onChange(m)} style={{ flex: 1, padding: "10px 0", border: `1px solid ${value === m ? MEMBER_COLORS[m] : C.border}`, borderRadius: 10, background: value === m ? MEMBER_COLORS[m] + "20" : C.bgInset, color: value === m ? MEMBER_COLORS[m] : C.textLo, fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>{m}</button>
      ))}
    </div>
  );

  const SectionBlock = ({ mobile = false }) => (
    <>
      {sectionStructure.map(sec => {
        const totals = sectionTotals[sec.name];
        const isExpanded = !!expandedSections[sec.name];
        const secOver = totals.spent > totals.budget + 2;
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
                        <span style={{ fontSize: 12, color: C.textMid, fontWeight: 500 }}>{c}</span>
                        {status !== "ok" && <span style={{ fontSize: 10, color: sc.color, fontWeight: 800 }}>{sc.icon}</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: sc.color, fontFamily: "'DM Mono',monospace" }}>{fmt(spent)}</span>
                        <span style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace" }}>/ {fmt(budgets[c])}</span>
                      </div>
                    </div>
                    <CategoryBar spent={spent} budget={budgets[c]} color={catColors[c] || C.accent} dayOfMonth={dayOfMonth} daysInMonth={daysInMonth} />
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
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Sora', sans-serif", color: C.textHi, paddingBottom: 60 }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        .npill { background: none; border: none; cursor: pointer; font-family: 'Sora',sans-serif; font-size: 13px; font-weight: 500; padding: 8px 15px; border-radius: 8px; transition: all 0.18s; color: ${C.textLo}; }
        .npill.active { background: ${C.accentDim}; color: ${C.accent}; font-weight: 600; }
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
        .card { background: ${C.bgCard}; border: 1px solid ${C.border}; border-radius: 16px; }
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
      <header style={{ background: C.bgCard, borderBottom: `1px solid ${C.border}`, padding: isDesktop ? "0 24px" : "0 16px", position: "sticky", top: 0, zIndex: 100 }}>
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
                  {[["dashboard","Budget Dashboard"],["longterm","Long Term Goals"],["budgets","Budget Details"]].map(([v, label]) => (
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
              <div style={{ display: "flex", borderTop: `1px solid ${C.border}`, marginLeft: -16, marginRight: -16, paddingLeft: 8, paddingRight: 8, paddingBottom: 6 }}>
                {[["dashboard","Dashboard"],["longterm","Long Term"],["budgets","Details"]].map(([v, label]) => (
                  <button key={v} className={`npill ${view === v ? "active" : ""}`} onClick={() => setView(v)} style={{ flex: 1, textAlign: "center", fontSize: 12, padding: "7px 4px" }}>{label}</button>
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
            <div><FL>Date</FL><input className="inp" type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} style={{ colorScheme: "dark" }} /></div>
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
            <div><FL>Color</FL><div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{PALETTE.map(p => (<div key={p} className="swatch" style={{ background: p, borderColor: catForm.color === p ? "#fff" : "transparent", boxShadow: catForm.color === p ? "0 0 0 1px #fff" : "none" }} onClick={() => setCatForm(f => ({ ...f, color: p }))} />))}</div></div>
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
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}><FL>Saved</FL><div style={{ position: "relative" }}><span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.textLo }}>$</span><input className="inp" type="number" min="0" step="0.01" value={ltForm.saved} onChange={e => setLtForm(f => ({ ...f, saved: e.target.value }))} style={{ paddingLeft: 28 }} /></div></div>
              <div style={{ flex: 1 }}><FL>Goal</FL><div style={{ position: "relative" }}><span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.textLo }}>$</span><input className="inp" type="number" min="0" step="0.01" value={ltForm.goal} onChange={e => setLtForm(f => ({ ...f, goal: e.target.value }))} style={{ paddingLeft: 28 }} /></div></div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}><FL>Start Date</FL><input className="inp" type="month" value={ltForm.startDate} onChange={e => setLtForm(f => ({ ...f, startDate: e.target.value }))} style={{ colorScheme: "dark" }} /></div>
              <div style={{ flex: 1 }}><FL>Target Date</FL><input className="inp" type="month" value={ltForm.targetDate} onChange={e => setLtForm(f => ({ ...f, targetDate: e.target.value }))} style={{ colorScheme: "dark" }} /></div>
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
                    /* ── Desktop: donut left, stats right ── */
                    <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
                      {/* Donut */}
                      <HeroDonut segments={donutSegments} totalSpend={totalSpend} totalBudget={totalBudget} size={160} />
                      {/* Divider */}
                      <div style={{ width: 1, height: 120, background: C.border, flexShrink: 0 }} />
                      {/* Stats column */}
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
                        {/* Spend + budget + pill row */}
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 1.5, marginBottom: 4 }}>spent</div>
                            <div style={{ fontSize: 36, fontWeight: 800, color: overBudget ? "#f85149" : C.textHi, letterSpacing: -1.5, lineHeight: 1, fontFamily: "'DM Mono',monospace" }}>{fmt(totalSpend)}</div>
                          </div>
                          <div style={{ paddingBottom: 4 }}>
                            <div style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 1.5, marginBottom: 4 }}>budget</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: C.textLo, letterSpacing: -0.5, lineHeight: 1, fontFamily: "'DM Mono',monospace" }}>{fmt(totalBudget)}</div>
                          </div>
                          <div style={{ paddingBottom: 6 }}>
                            <div style={{
                              display: "inline-flex", alignItems: "center",
                              padding: "5px 12px", borderRadius: 6,
                              background: diff >= 0 ? "rgba(35,134,54,0.15)" : "rgba(218,54,51,0.15)",
                              color: diff >= 0 ? "#3fb950" : "#f85149",
                              fontFamily: "'DM Mono',monospace", fontWeight: 700, fontSize: 13,
                            }}>
                              {diff >= 0 ? "+" : "−"}{fmt(Math.abs(diff))} {diff >= 0 ? "under" : "over"}
                            </div>
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div>
                          <div style={{ background: C.borderMid, borderRadius: 999, height: 3, overflow: "hidden" }}>
                            <div style={{
                              width: `${Math.min((totalSpend / Math.max(totalBudget, 1)) * 100, 100)}%`,
                              height: "100%", borderRadius: 999, transition: "width 0.5s",
                              background: overBudget ? "#f85149" : `linear-gradient(90deg, ${C.accent}, #3fb950)`,
                            }} />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                            <div style={{ fontSize: 9, color: C.textLo, fontFamily: "'DM Mono',monospace" }}>
                              {isCurrentMonth ? `day ${dayOfMonth} of ${daysInMonth}` : isFutureMonth ? "future" : "past month"}
                            </div>
                            <div style={{ fontSize: 9, color: C.textLo, fontFamily: "'DM Mono',monospace" }}>
                              {Math.round((totalSpend / Math.max(totalBudget, 1)) * 100)}%
                            </div>
                          </div>
                        </div>
                        {/* Member bars */}
                        <div style={{ display: "flex", gap: 24 }}>
                          {FAMILY_MEMBERS.map(m => (
                            <div key={m} style={{ minWidth: 120 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                <span style={{ fontSize: 11, color: MEMBER_COLORS[m], fontWeight: 600 }}>{m}</span>
                                <span style={{ fontSize: 11, color: MEMBER_COLORS[m], fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{fmt(byMember[m])}</span>
                              </div>
                              <div style={{ background: C.borderMid, borderRadius: 999, height: 3 }}>
                                <div style={{ width: `${(byMember[m] / maxMemberSpend) * 100}%`, height: "100%", background: MEMBER_COLORS[m], borderRadius: 999, transition: "width 0.5s" }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Divider */}
                      <div style={{ width: 1, height: 120, background: C.border, flexShrink: 0 }} />
                      {/* Legend */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 9, minWidth: 110 }}>
                        {donutSegments.filter(s => s.value > 0).map((s, i) => (
                          <LegendItem key={i} color={s.color} label={s.label} value={s.value} fmt={fmt} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* ── Mobile: numbers-first layout ── */
                    <div>
                      {/* Big spend number */}
                      <div style={{ textAlign: "center", marginBottom: 16 }}>
                        <div style={{ fontSize: 42, fontWeight: 800, color: overBudget ? "#f85149" : C.textHi, fontFamily: "'DM Mono',monospace", letterSpacing: -2, lineHeight: 1 }}>{fmt(totalSpend)}</div>
                        <div style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 1, marginTop: 5 }}>spent this month</div>
                      </div>

                      {/* Budget + remaining tiles */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                        <div style={{ background: C.bgInset, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" }}>
                          <div style={{ fontSize: 9, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 1, marginBottom: 3 }}>budget</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: -0.5 }}>{fmt(totalBudget)}</div>
                        </div>
                        <div style={{
                          background: diff >= 0 ? "rgba(35,134,54,0.1)" : "rgba(218,54,51,0.1)",
                          border: `0.5px solid ${diff >= 0 ? "rgba(35,134,54,0.3)" : "rgba(218,54,51,0.3)"}`,
                          borderRadius: 10, padding: "10px 12px"
                        }}>
                          <div style={{ fontSize: 9, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 1, marginBottom: 3 }}>remaining</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: diff >= 0 ? "#3fb950" : "#f85149", fontFamily: "'DM Mono',monospace", letterSpacing: -0.5 }}>
                            {diff >= 0 ? "+" : "−"}{fmt(Math.abs(diff))}
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ background: C.borderMid, borderRadius: 999, height: 4, overflow: "hidden" }}>
                          <div style={{
                            width: `${Math.min((totalSpend / Math.max(totalBudget, 1)) * 100, 100)}%`,
                            height: "100%", borderRadius: 999, transition: "width 0.5s",
                            background: overBudget ? "#f85149" : `linear-gradient(90deg, ${C.accent}, #3fb950)`,
                          }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                          <div style={{ fontSize: 9, color: C.textLo, fontFamily: "'DM Mono',monospace" }}>
                            {isCurrentMonth ? `day ${dayOfMonth} of ${daysInMonth}` : isFutureMonth ? "future" : "past month"}
                          </div>
                          <div style={{ fontSize: 9, color: C.textLo, fontFamily: "'DM Mono',monospace" }}>
                            {Math.round((totalSpend / Math.max(totalBudget, 1)) * 100)}%
                          </div>
                        </div>
                      </div>

                      {/* Legend 2-col grid */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 8px" }}>
                        {donutSegments.filter(s => s.value > 0).map((s, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 7, height: 7, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 10, color: C.textMid, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
                            <span style={{ fontSize: 10, color: s.color, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{fmt(s.value)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Member bars */}
                      <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
                        {FAMILY_MEMBERS.map(m => (
                          <div key={m} style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontSize: 10, color: MEMBER_COLORS[m], fontWeight: 600 }}>{m}</span>
                              <span style={{ fontSize: 10, color: MEMBER_COLORS[m], fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{fmt(byMember[m])}</span>
                            </div>
                            <div style={{ background: C.borderMid, borderRadius: 999, height: 3 }}>
                              <div style={{ width: `${(byMember[m] / maxMemberSpend) * 100}%`, height: "100%", background: MEMBER_COLORS[m], borderRadius: 999, transition: "width 0.5s" }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sections + Breakdown */}
                {isDesktop ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>
                    <div className="card" style={{ padding: "20px 24px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <div style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 2 }}>SPENDING</div>
                        {isCurrentMonth && <div style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace", display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 1.5, height: 8, background: "rgba(255,255,255,0.25)", borderRadius: 1 }} /> TODAY</div>}
                      </div>
                      <SectionBlock />
                    </div>
                    <div className="card" style={{ padding: "20px 20px" }}>
                      <div style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 2, marginBottom: 14 }}>BREAKDOWN</div>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead><tr><th style={{ textAlign: "left", color: C.textLo, padding: "0 0 10px", fontWeight: 500, fontSize: 10, fontFamily: "'DM Mono',monospace", letterSpacing: 1 }}>CAT</th>{FAMILY_MEMBERS.map(m => (<th key={m} style={{ textAlign: "right", color: MEMBER_COLORS[m], padding: "0 0 10px 10px", fontWeight: 600, fontSize: 11 }}>{m}</th>))}</tr></thead>
                        <tbody>{categories.filter(c => (byCategory[c] || 0) > 0).map(c => (
                          <tr key={c} style={{ borderTop: `1px solid ${C.borderMid}` }}>
                            <td style={{ padding: "8px 0", color: C.textMid, display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 5, height: 5, borderRadius: 1, background: catColors[c] || C.textLo, display: "inline-block", flexShrink: 0 }} />{c}</td>
                            {FAMILY_MEMBERS.map(m => (<td key={m} style={{ textAlign: "right", padding: "8px 0 8px 10px", color: (byMemberCategory[m] && byMemberCategory[m][c]) > 0 ? C.textHi : C.borderMid, fontFamily: "'DM Mono',monospace", fontSize: 11 }}>{(byMemberCategory[m] && byMemberCategory[m][c]) > 0 ? fmt(byMemberCategory[m][c]) : "—"}</td>))}
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div className="card" style={{ padding: "18px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <div style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 2 }}>SPENDING</div>
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
                          <thead><tr><th style={{ textAlign: "left", color: C.textLo, padding: "0 0 10px", fontWeight: 500, fontSize: 10, fontFamily: "'DM Mono',monospace", letterSpacing: 1 }}>Category</th>{FAMILY_MEMBERS.map(m => (<th key={m} style={{ textAlign: "right", color: MEMBER_COLORS[m], padding: "0 0 10px 10px", fontWeight: 600 }}>{m}</th>))}</tr></thead>
                          <tbody>{categories.filter(c => (byCategory[c] || 0) > 0).map(c => (
                            <tr key={c} style={{ borderTop: `1px solid ${C.borderMid}` }}>
                              <td style={{ padding: "8px 0", color: C.textMid, display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 5, height: 5, borderRadius: 1, background: catColors[c] || C.textLo, display: "inline-block" }} />{c}</td>
                              {FAMILY_MEMBERS.map(m => (<td key={m} style={{ textAlign: "right", padding: "8px 0 8px 10px", color: (byMemberCategory[m] && byMemberCategory[m][c]) > 0 ? C.textHi : C.borderMid, fontFamily: "'DM Mono',monospace" }}>{(byMemberCategory[m] && byMemberCategory[m][c]) > 0 ? fmt(byMemberCategory[m][c]) : "—"}</td>))}
                            </tr>
                          ))}</tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {/* Entries table — full width */}
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
                      <div className="tr-hdr">
                        {["DATE","WHO","CATEGORY","AMOUNT","NOTES"].map(h => (
                          <div key={h} style={{ padding: "0 10px", fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 1.5 }}>{h}</div>
                        ))}
                      </div>
                      {sortedEntries.map((e, i) => (
                        <div key={e.id} className="tr-row" style={{ background: i % 2 === 1 ? C.bgInset : "transparent" }} onClick={() => openEditEntry(e)}>
                          <div className="tc" style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: C.textLo }}>{e.date.slice(0, 10)}</div>
                          <div className="tc">
                            <div style={{ width: 22, height: 22, borderRadius: 6, background: (MEMBER_COLORS[e.member] || C.textLo) + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: MEMBER_COLORS[e.member] || C.textLo }}>{e.member ? e.member[0] : "?"}</div>
                          </div>
                          <div className="tc" style={{ gap: 6 }}>
                            <span style={{ width: 5, height: 5, borderRadius: 1, background: catColors[e.category] || C.textLo, display: "inline-block", flexShrink: 0 }} />
                            <span style={{ color: C.textMid, fontSize: 12 }}>{e.category}</span>
                          </div>
                          <div className="tc" style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: catColors[e.category] || C.textMid, fontSize: 12 }}>{fmtD(e.amount)}</div>
                          <div className="tc" style={{ color: C.textLo, fontSize: 11 }}>{e.notes || <span style={{ color: C.borderMid }}>—</span>}</div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      <div className="tr-hdr-m">
                        {["DATE","DETAILS","AMT"].map(h => (
                          <div key={h} style={{ padding: "0 10px", fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 1.5 }}>{h}</div>
                        ))}
                      </div>
                      {sortedEntries.map((e, i) => (
                        <div key={e.id} className="tr-row-m" style={{ background: i % 2 === 1 ? C.bgInset : "transparent" }} onClick={() => openEditEntry(e)}>
                          <div style={{ padding: "10px", fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace", display: "flex", alignItems: "center" }}>{e.date.slice(5, 10)}</div>
                          <div style={{ padding: "10px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 2 }}>
                            <div style={{ fontSize: 12, color: C.textMid, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                              <span style={{ width: 4, height: 4, borderRadius: 1, background: catColors[e.category] || C.textLo, display: "inline-block" }} />{e.category}
                            </div>
                            <div style={{ fontSize: 10, color: C.textLo }}>{e.member}{e.notes ? ` · ${e.notes}` : ""}</div>
                          </div>
                          <div style={{ padding: "10px", display: "flex", alignItems: "center", justifyContent: "flex-end", fontFamily: "'DM Mono',monospace", fontWeight: 700, color: catColors[e.category] || C.textMid, fontSize: 12 }}>{fmtD(e.amount)}</div>
                        </div>
                      ))}
                    </>
                  )
                ) : null}
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
                          <CategoryBar spent={byCategory[form.category] || 0} budget={budgets[form.category]} color={catColors[form.category] || C.accent} dayOfMonth={dayOfMonth} daysInMonth={daysInMonth} />
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

            {/* BUDGET DETAILS */}
            {view === "budgets" && (
              <div className="fu" style={{ maxWidth: 520, margin: "0 auto" }}>
                <div className="card" style={{ padding: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.textHi }}>Categories</div>
                    <button onClick={openNewCat} style={{ background: C.bgInset, border: `1px solid ${C.border}`, borderRadius: 8, color: C.sand, fontSize: 12, fontWeight: 600, padding: "7px 14px", cursor: "pointer", fontFamily: "'Sora',sans-serif" }}>+ New</button>
                  </div>
                  {categories.map(c => {
                    const status = categoryStatuses[c];
                    const sc = STATUS[status];
                    return (
                      <div key={c} onClick={() => openEditCat(c)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 8px", borderBottom: `1px solid ${C.borderMid}`, cursor: "pointer", borderRadius: 8, transition: "background 0.12s" }} onMouseEnter={e => e.currentTarget.style.background = C.bgInset} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 3, background: catColors[c] || C.textLo, flexShrink: 0 }} />
                          <span style={{ fontSize: 14, color: C.textHi, fontWeight: 600 }}>{c}</span>
                          {status !== "ok" && <span style={{ fontSize: 10, color: sc.color, fontWeight: 800 }}>{sc.icon}</span>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: sc.color, fontFamily: "'DM Mono',monospace" }}>{fmt(byCategory[c] || 0)}</span>
                          <span style={{ fontSize: 11, color: C.textLo, fontFamily: "'DM Mono',monospace" }}>/ {fmt(budgets[c])}</span>
                          <span style={{ color: C.textLo }}>›</span>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ marginTop: 16, padding: "12px 14px", background: C.bgInset, borderRadius: 10, border: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: C.textLo, fontWeight: 600 }}>Total budget</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.sand, fontFamily: "'DM Mono',monospace" }}>{fmt(totalBudget)} / month</span>
                  </div>
                </div>
              </div>
            )}

            {/* LONG TERM */}
            {view === "longterm" && (
              <div className="fu">
                {longTerm.length === 0
                  ? <div style={{ textAlign: "center", padding: "60px 0", color: C.textLo, fontSize: 13 }}>No goals yet.</div>
                  : (
                    <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : "1fr", gap: 14 }}>
                      {longTerm.map((item, i) => {
                        const pct = item.goal > 0 ? Math.min(item.saved / item.goal, 1) : 0;
                        const color = ltColor(item, i);
                        const remaining = Math.max(item.goal - item.saved, 0);
                        const done = item.saved >= item.goal;
                        let pacingPct = null;
                        if (item.targetDate && item.goal > 0 && !done) {
                          const target = new Date(item.targetDate + '-01');
                          const start = item.startDate ? new Date(item.startDate + '-01') : new Date(now.getFullYear(), now.getMonth() - 1, 1);
                          const totalDur = target - start;
                          const elapsed = now - start;
                          if (totalDur > 0 && elapsed >= 0) pacingPct = Math.min(elapsed / totalDur, 0.98);
                        }
                        return (
                          <div key={i} className="lt-card" onClick={() => openEditLT(i)}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: C.textHi }}>{item.name}</div>
                              <span style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace" }}>edit ›</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                              <div style={{ position: "relative", flexShrink: 0 }}>
                                <MiniDonut saved={item.saved} goal={item.goal} color={color} />
                                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <div style={{ fontSize: 12, fontWeight: 700, color, fontFamily: "'DM Mono',monospace" }}>{Math.round(pct * 100)}%</div>
                                </div>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                {done ? (
                                  <div style={{ background: color + "18", border: `1px solid ${color}35`, borderRadius: 10, padding: "10px 12px" }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 4 }}>🎉 Goal reached!</div>
                                    <div style={{ fontSize: 11, color: C.textMid, lineHeight: 1.5 }}>You can now put extra funds towards other goals!</div>
                                  </div>
                                ) : (
                                  <>
                                    <div style={{ display: "flex", gap: 14, marginBottom: 6 }}>
                                      <div><div style={{ fontSize: 9, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 1, marginBottom: 2 }}>SAVED</div><div style={{ fontSize: 16, fontWeight: 700, color, fontFamily: "'DM Mono',monospace" }}>{fmt(item.saved)}</div></div>
                                      <div><div style={{ fontSize: 9, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 1, marginBottom: 2 }}>GOAL</div><div style={{ fontSize: 16, fontWeight: 600, color: C.textLo, fontFamily: "'DM Mono',monospace" }}>{fmt(item.goal)}</div></div>
                                    </div>
                                    <div style={{ fontSize: 10, color: C.textLo, fontFamily: "'DM Mono',monospace" }}>
                                      {fmt(remaining)} to go{item.targetDate ? ` · ${new Date(item.targetDate + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : ''}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                            <div style={{ marginTop: 14, background: C.borderMid, borderRadius: 999, height: 4, position: "relative" }}>
                              <div style={{ width: `${pct * 100}%`, height: "100%", background: color, borderRadius: 999, transition: "width 0.5s" }} />
                              {pacingPct !== null && <div style={{ position: "absolute", top: -3, bottom: -3, left: `${pacingPct * 100}%`, width: 2, background: "rgba(255,255,255,0.45)", borderRadius: 1, transform: "translateX(-50%)" }} />}
                            </div>
                            {pacingPct !== null && <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}><span style={{ fontSize: 9, color: C.textLo, fontFamily: "'DM Mono',monospace", letterSpacing: 1 }}>— EXPECTED TODAY</span></div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                <div style={{ marginTop: 16, background: C.bgCard, border: `1px dashed ${C.border}`, borderRadius: 14, padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                  <div style={{ fontSize: 13, color: C.textLo }}>Looking to track a new long-term goal?</div>
                  <button onClick={openNewLT} style={{ background: C.accent, border: "none", borderRadius: 9, color: "#fff", fontSize: 12, fontWeight: 700, padding: "9px 20px", cursor: "pointer", fontFamily: "'Sora',sans-serif", whiteSpace: "nowrap" }}>Add</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
