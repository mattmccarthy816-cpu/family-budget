import { useState, useMemo, useEffect, useCallback } from "react";

const API_URL = "https://script.google.com/macros/s/AKfycbxmhYh8sd-xU0AHFFWSnu7IE1UccUr5R8TaVFRrtou9qnsT_LO8skn9X18CVy1AdVjqBQ/exec";

const FAMILY_MEMBERS = ["Matt", "Alice"];
const PALETTE = ["#4ade80","#f97316","#60a5fa","#a78bfa","#f472b6","#34d399","#fbbf24","#94a3b8","#fb7185","#38bdf8","#c084fc","#fdba74","#86efac","#67e8f9","#fde68a","#d8b4fe"];
const MEMBER_COLORS = { "Matt": "#60a5fa", "Alice": "#f472b6" };
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }

function getCategoryStatus(spent, budget, dayOfMonth, daysInMonth) {
  const progress = dayOfMonth / daysInMonth;
  if (Math.abs(spent - budget) <= 2) return "ok";
  if (spent > budget + 2) return "over";
  if (dayOfMonth < 15) return "ok";
  const proj = spent / progress;
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
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 900);
  useEffect(() => {
    const h = () => setIsDesktop(window.innerWidth >= 900);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return isDesktop;
}

// Hero donut — multi-segment showing each category's spend
function HeroDonut({ byCategory, catColors, categories, totalBudget, totalSpend, size = 180 }) {
  const r = 70, cx = 90, cy = 90, stroke = 14;
  const circ = 2 * Math.PI * r;
  const total = Math.max(totalBudget, totalSpend, 1);
  let offset = 0;
  const segments = categories
    .filter(c => (byCategory[c] || 0) > 0)
    .map(c => {
      const pct = (byCategory[c] || 0) / total;
      const seg = { c, pct, offset, color: catColors[c] || "#94a3b8" };
      offset += pct;
      return seg;
    });
  const budgetPct = Math.min(totalBudget / total, 1);
  const spendPct = Math.min(totalSpend / total, 1);
  const fmt = n => `$${Math.round(n).toLocaleString("en-US")}`;
  const overBudget = totalSpend > totalBudget + 2;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg viewBox="0 0 180 180" style={{ width: size, height: size, transform: "rotate(-90deg)" }}>
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
        {/* Budget arc (lighter) */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#334155" strokeWidth={stroke}
          strokeDasharray={`${budgetPct * circ} ${circ}`} strokeLinecap="butt" />
        {/* Category segments */}
        {segments.map(seg => (
          <circle key={seg.c} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth={stroke}
            strokeDasharray={`${seg.pct * circ - 1} ${circ}`}
            strokeDashoffset={-seg.offset * circ}
            strokeLinecap="butt"
            style={{ transition: "stroke-dasharray 0.6s cubic-bezier(.4,0,.2,1)" }} />
        ))}
      </svg>
      {/* Center label */}
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: overBudget ? "#ef4444" : "#f1f5f9", fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{fmt(totalSpend)}</div>
        <div style={{ fontSize: 10, color: "#475569", marginTop: 3, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>SPENT</div>
      </div>
    </div>
  );
}

// Slim donut for long term
function DonutChart({ saved, goal, color }) {
  const pct = goal > 0 ? Math.min(saved / goal, 1) : 0;
  const r = 40, cx = 50, cy = 50, stroke = 10;
  const circ = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 100 100" style={{ width: 90, height: 90, transform: "rotate(-90deg)" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s" }} />
    </svg>
  );
}

function CategoryBar({ spent, budget, color, dayOfMonth, daysInMonth }) {
  const progress = dayOfMonth / daysInMonth;
  const pct = Math.min((spent / budget) * 100, 100);
  const status = getCategoryStatus(spent, budget, dayOfMonth, daysInMonth);
  const projPct = Math.min((spent / Math.max(progress, 0.01) / budget) * 100, 100);
  const barColor = status === "ok" ? color : status === "warn" ? "#eab308" : status === "risk" ? "#f97316" : "#ef4444";
  return (
    <div style={{ flex: 1, background: "#1e293b", borderRadius: 999, height: 5, position: "relative", minWidth: 80 }}>
      {status !== "over" && <div style={{ position: "absolute", left: 0, top: 0, width: `${projPct}%`, height: "100%", background: barColor + "30", borderRadius: 999 }} />}
      <div style={{ position: "absolute", left: 0, top: 0, width: `${pct}%`, height: "100%", background: barColor, borderRadius: 999, transition: "width 0.5s" }} />
      <div style={{ position: "absolute", top: -3, bottom: -3, left: `${progress * 100}%`, width: 2, background: "rgba(255,255,255,0.4)", borderRadius: 1, transform: "translateX(-50%)" }} />
    </div>
  );
}

function Modal({ onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 20, padding: 28, width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 80, gap: 16 }}>
      <div style={{ width: 32, height: 32, border: "2px solid #1e293b", borderTop: "2px solid #60a5fa", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ color: "#334155", fontSize: 12, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>CONNECTING TO SHEETS</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function App() {
  const isDesktop = useIsDesktop();
  const [allEntries, setAllEntries] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [catColors, setCatColors] = useState({});
  const [longTerm, setLongTerm] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState("dashboard");
  const [toast, setToast] = useState(null);
  const [nextId, setNextId] = useState(1);
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
      setAllEntries(entries); setBudgets(bm); setCatColors(cm); setLongTerm(lt);
      setNextId(entries.reduce((m, e) => Math.max(m, parseInt(e.id) || 0), 0) + 1);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [api]);

  useEffect(() => { loadData(); }, [loadData]);

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
  const isFutureMonth = viewYear > now.getFullYear() || (viewYear === now.getFullYear() && viewMonth > now.getMonth());
  const isPastMonth = !isCurrentMonth && !isFutureMonth;
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
  const sortedCategories = useMemo(() => [...categories].sort((a, b) => ({ over: 0, risk: 1, warn: 2, ok: 3 })[categoryStatuses[a]] - ({ over: 0, risk: 1, warn: 2, ok: 3 })[categoryStatuses[b]]), [categories, categoryStatuses]);
  const ltColor = (item, i) => item.color && item.color !== '' ? item.color : PALETTE[i % PALETTE.length];

  function prevMonth() { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); }
  function nextMonth() { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); }

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
  function openEditLT(i) { setLtForm({ name: longTerm[i].name, saved: String(longTerm[i].saved), goal: String(longTerm[i].goal), color: longTerm[i].color || PALETTE[0], targetDate: longTerm[i].targetDate || "", startDate: longTerm[i].startDate || "" }); setEditLT(i); }
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

  const remaining = Math.max(totalBudget - totalSpend, 0);
  const overBudget = totalSpend > totalBudget + 2;
  const mw = isDesktop ? 1320 : 700;

  // Shared modal content helpers
  const MemberChips = ({ value, onChange }) => (
    <div style={{ display: "flex", gap: 8 }}>
      {FAMILY_MEMBERS.map(m => (
        <button key={m} onClick={() => onChange(m)} style={{ flex: 1, padding: "10px 0", border: `1px solid ${value === m ? MEMBER_COLORS[m] : "#1e293b"}`, borderRadius: 10, background: value === m ? MEMBER_COLORS[m] + "20" : "#0a0f1e", color: value === m ? MEMBER_COLORS[m] : "#475569", fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{m}</button>
      ))}
    </div>
  );

  const FieldLabel = ({ children }) => (
    <div style={{ fontSize: 10, color: "#475569", fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>{children}</div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#060d1a", fontFamily: "'Sora', sans-serif", color: "#f1f5f9", paddingBottom: 60 }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
        .nav-pill { background: none; border: none; cursor: pointer; font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 500; padding: 8px 16px; border-radius: 8px; transition: all 0.18s; color: #475569; letter-spacing: 0.2px; }
        .nav-pill.active { background: #0f2040; color: #60a5fa; font-weight: 600; }
        .nav-pill:not(.active):hover { color: #94a3b8; }
        .inp { width: 100%; background: #0a1628; border: 1px solid #1e293b; border-radius: 10px; padding: 12px 14px; color: #f1f5f9; font-family: 'Sora', sans-serif; font-size: 14px; outline: none; transition: border 0.18s; appearance: none; }
        .inp:focus { border-color: #3b82f6; }
        .inp option { background: #0a1628; }
        .chip { display: inline-flex; align-items: center; gap: 5px; padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 600; border: none; cursor: pointer; font-family: 'Sora', sans-serif; transition: all 0.15s; }
        .cta { width: 100%; padding: 14px; border-radius: 12px; border: none; background: #1d4ed8; color: #fff; font-size: 14px; font-weight: 700; font-family: 'Sora', sans-serif; cursor: pointer; transition: opacity 0.2s; letter-spacing: 0.3px; }
        .cta:hover { opacity: 0.88; }
        .cta:disabled { opacity: 0.4; cursor: not-allowed; }
        .del-btn { background: none; border: 1px solid #7f1d1d; color: #f87171; border-radius: 8px; padding: 8px 16px; font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
        .del-btn:hover { background: #450a0a; }
        .swatch { width: 20px; height: 20px; border-radius: 5px; cursor: pointer; border: 2px solid transparent; transition: transform 0.1s; flex-shrink: 0; }
        .swatch:hover { transform: scale(1.2); }
        .entry-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 4px; border-bottom: 1px solid #0d1f35; gap: 8px; cursor: pointer; border-radius: 8px; transition: background 0.12s; }
        .entry-row:last-child { border-bottom: none; }
        .entry-row:hover { background: #0a1628; }
        .cat-row { display: flex; align-items: center; padding: 13px 0; border-bottom: 1px solid #0d1f35; gap: 12px; cursor: pointer; transition: background 0.12s; border-radius: 8px; }
        .cat-row:last-child { border-bottom: none; }
        .cat-row:hover { background: #0a162888; padding-left: 6px; padding-right: 6px; margin-left: -6px; margin-right: -6px; }
        .month-btn { background: none; border: 1px solid #1e293b; color: #475569; border-radius: 8px; padding: 6px 14px; cursor: pointer; font-family: 'DM Mono', monospace; font-size: 12px; transition: all 0.15s; letter-spacing: 0.5px; }
        .month-btn:hover { border-color: #3b82f6; color: #60a5fa; }
        .card { background: #0a1628; border: 1px solid #0d1f35; border-radius: 16px; }
        .lt-card { background: #0a1628; border: 1px solid #0d1f35; border-radius: 16px; padding: 20px; cursor: pointer; transition: border-color 0.15s, background 0.15s; }
        .lt-card:hover { background: #0d1f35; border-color: #1e3a5f; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.35s cubic-bezier(.4,0,.2,1) both; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── HEADER ── */}
      <header style={{ background: "#060d1a", borderBottom: "1px solid #0d1f35", padding: isDesktop ? "0 24px" : "0 16px", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: mw, margin: "0 auto" }}>
          {isDesktop ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.5, color: "#f1f5f9" }}>
                  <span style={{ color: "#3b82f6" }}>family</span><span style={{ color: "#94a3b8", fontWeight: 400 }}>·</span>budget
                </div>
                {alertCount > 0 && <span style={{ background: overCount > 0 ? "#ef444420" : "#f9731620", color: overCount > 0 ? "#ef4444" : "#f97316", border: `1px solid ${overCount > 0 ? "#7f1d1d" : "#7c2d12"}`, fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "2px 9px", fontFamily: "'DM Mono',monospace" }}>{alertCount} alert{alertCount > 1 ? "s" : ""}</span>}
                {syncing && <span style={{ fontSize: 10, color: "#334155", fontFamily: "'DM Mono',monospace", letterSpacing: 1 }}>SYNCING</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ display: "flex", gap: 2, background: "#0a1628", borderRadius: 10, padding: 3 }}>
                  {[["dashboard", "Budget Dashboard"], ["longterm", "Long Term Goals"], ["budgets", "Budget Details"]].map(([v, label]) => (
                    <button key={v} className={`nav-pill ${view === v ? "active" : ""}`} onClick={() => setView(v)}>{label}</button>
                  ))}
                </div>
                <button onClick={() => setView("add")} style={{ background: view === "add" ? "#1d4ed8" : "#1d4ed8", border: "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700, padding: "9px 18px", cursor: "pointer", fontFamily: "'Sora',sans-serif", letterSpacing: 0.3, opacity: view === "add" ? 0.7 : 1 }}>+ Add</button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.5, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#3b82f6" }}>family</span><span style={{ color: "#334155" }}>·</span>budget
                    {alertCount > 0 && <span style={{ background: overCount > 0 ? "#ef444420" : "#f9731620", color: overCount > 0 ? "#ef4444" : "#f97316", border: `1px solid ${overCount > 0 ? "#7f1d1d" : "#7c2d12"}`, fontSize: 9, fontWeight: 700, borderRadius: 999, padding: "2px 7px", fontFamily: "'DM Mono',monospace" }}>{alertCount}</span>}
                    {syncing && <span style={{ fontSize: 9, color: "#334155", fontFamily: "'DM Mono',monospace" }}>SYNC</span>}
                  </div>
                  <div style={{ fontSize: 10, color: "#1e3a5f", fontFamily: "'DM Mono',monospace", marginTop: 1, letterSpacing: 1 }}>{MONTH_NAMES[viewMonth].toUpperCase()} {viewYear}</div>
                </div>
                <button onClick={() => setView("add")} style={{ background: "#1d4ed8", border: "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700, padding: "8px 16px", cursor: "pointer", fontFamily: "'Sora',sans-serif" }}>+ Add</button>
              </div>
              <div style={{ display: "flex", borderTop: "1px solid #0d1f35", marginLeft: -16, marginRight: -16, paddingLeft: 8, paddingRight: 8, paddingBottom: 6 }}>
                {[["dashboard", "Dashboard"], ["longterm", "Long Term"], ["budgets", "Details"]].map(([v, label]) => (
                  <button key={v} className={`nav-pill ${view === v ? "active" : ""}`} onClick={() => setView(v)} style={{ flex: 1, textAlign: "center", fontSize: 12, padding: "7px 4px" }}>{label}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Toast */}
      {toast && <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: toast.ok ? "#052e16" : "#450a0a", border: `1px solid ${toast.ok ? "#16a34a" : "#dc2626"}`, color: toast.ok ? "#4ade80" : "#f87171", padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 500, boxShadow: "0 8px 40px rgba(0,0,0,0.6)" }}>{toast.msg}</div>}

      {/* Edit Entry Modal */}
      {editEntry && (
        <Modal onClose={() => setEditEntry(null)}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Edit Entry</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><FieldLabel>Member</FieldLabel><MemberChips value={editForm.member} onChange={m => setEditForm(f => ({ ...f, member: m }))} /></div>
            <div><FieldLabel>Category</FieldLabel><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{categories.map(c => (<button key={c} className="chip" onClick={() => setEditForm(f => ({ ...f, category: c }))} style={{ background: editForm.category === c ? catColors[c] + "25" : "#0a1628", border: `1px solid ${editForm.category === c ? catColors[c] : "#1e293b"}`, color: editForm.category === c ? catColors[c] : "#475569" }}>{c}</button>))}</div></div>
            <div><FieldLabel>Amount</FieldLabel><div style={{ position: "relative" }}><span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#334155" }}>$</span><input className="inp" type="number" min="0" step="0.01" value={editForm.amount} onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} style={{ paddingLeft: 28 }} /></div></div>
            <div><FieldLabel>Date</FieldLabel><input className="inp" type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div><FieldLabel>Notes (optional)</FieldLabel><textarea className="inp" value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ resize: "none", lineHeight: 1.5 }} /></div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}><button className="cta" onClick={saveEditEntry} disabled={syncing} style={{ flex: 1 }}>Save</button><button className="del-btn" onClick={() => deleteEntry(editEntry.id)}>Delete</button></div>
          </div>
        </Modal>
      )}

      {/* Edit Category Modal */}
      {editCat !== null && (
        <Modal onClose={() => setEditCat(null)}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>{editCat === "new" ? "New Category" : "Edit Category"}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><FieldLabel>Name</FieldLabel><input className="inp" type="text" placeholder="e.g. Subscriptions" value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><FieldLabel>Monthly Budget</FieldLabel><div style={{ position: "relative" }}><span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#334155" }}>$</span><input className="inp" type="number" min="0" value={catForm.budget} onChange={e => setCatForm(f => ({ ...f, budget: e.target.value }))} style={{ paddingLeft: 28 }} /></div></div>
            <div><FieldLabel>Color</FieldLabel><div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{PALETTE.map(p => (<div key={p} className="swatch" style={{ background: p, borderColor: catForm.color === p ? "#fff" : "transparent", boxShadow: catForm.color === p ? "0 0 0 1px #fff" : "none" }} onClick={() => setCatForm(f => ({ ...f, color: p }))} />))}</div></div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}><button className="cta" onClick={saveCat} style={{ flex: 1 }}>{editCat === "new" ? "Add" : "Save"}</button>{editCat !== "new" && <button className="del-btn" onClick={() => deleteCat(editCat)}>Delete</button>}</div>
          </div>
        </Modal>
      )}

      {/* Edit Long Term Modal */}
      {editLT !== null && (
        <Modal onClose={() => setEditLT(null)}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>{editLT === "new" ? "New Goal" : "Edit Goal"}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><FieldLabel>Name</FieldLabel><input className="inp" type="text" placeholder="e.g. Emergency Fund" value={ltForm.name} onChange={e => setLtForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}><FieldLabel>Saved</FieldLabel><div style={{ position: "relative" }}><span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#334155" }}>$</span><input className="inp" type="number" min="0" step="0.01" value={ltForm.saved} onChange={e => setLtForm(f => ({ ...f, saved: e.target.value }))} style={{ paddingLeft: 28 }} /></div></div>
              <div style={{ flex: 1 }}><FieldLabel>Goal</FieldLabel><div style={{ position: "relative" }}><span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#334155" }}>$</span><input className="inp" type="number" min="0" step="0.01" value={ltForm.goal} onChange={e => setLtForm(f => ({ ...f, goal: e.target.value }))} style={{ paddingLeft: 28 }} /></div></div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}><FieldLabel>Start Date</FieldLabel><input className="inp" type="month" value={ltForm.startDate} onChange={e => setLtForm(f => ({ ...f, startDate: e.target.value }))} style={{ colorScheme: "dark" }} /></div>
              <div style={{ flex: 1 }}><FieldLabel>Target Date</FieldLabel><input className="inp" type="month" value={ltForm.targetDate} onChange={e => setLtForm(f => ({ ...f, targetDate: e.target.value }))} style={{ colorScheme: "dark" }} /></div>
            </div>
            <div><FieldLabel>Color</FieldLabel><div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{PALETTE.map(p => (<div key={p} className="swatch" style={{ background: p, borderColor: ltForm.color === p ? "#fff" : "transparent", boxShadow: ltForm.color === p ? "0 0 0 1px #fff" : "none" }} onClick={() => setLtForm(f => ({ ...f, color: p }))} />))}</div></div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}><button className="cta" onClick={saveLT} disabled={syncing} style={{ flex: 1 }}>{editLT === "new" ? "Add Goal" : "Save"}</button>{editLT !== "new" && <button className="del-btn" onClick={() => deleteLT(editLT)}>Delete</button>}</div>
          </div>
        </Modal>
      )}

      <div style={{ maxWidth: mw, margin: "0 auto", padding: isDesktop ? "28px 24px" : "20px 16px" }}>
        {loading ? <Spinner /> : error ? (
          <div style={{ textAlign: "center", padding: 48 }}>
            <div style={{ fontSize: 13, color: "#ef4444", marginBottom: 16, fontFamily: "'DM Mono',monospace" }}>CONNECTION ERROR</div>
            <div style={{ fontSize: 12, color: "#475569", marginBottom: 24 }}>{error}</div>
            <button className="cta" onClick={loadData} style={{ maxWidth: 160, margin: "0 auto" }}>Retry</button>
          </div>
        ) : (
          <>
            {/* ── DASHBOARD ── */}
            {view === "dashboard" && (
              <div className="fade-up">
                {/* Month nav */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                  <button className="month-btn" onClick={prevMonth}>← {MONTH_NAMES[viewMonth === 0 ? 11 : viewMonth - 1].slice(0, 3)}</button>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", letterSpacing: -0.3 }}>{MONTH_NAMES[viewMonth]} {viewYear}</div>
                    {isFutureMonth && <div style={{ fontSize: 10, color: "#1e3a5f", fontFamily: "'DM Mono',monospace", letterSpacing: 1 }}>FUTURE</div>}
                    {isPastMonth && <div style={{ fontSize: 10, color: "#1e3a5f", fontFamily: "'DM Mono',monospace", letterSpacing: 1 }}>PAST</div>}
                  </div>
                  <button className="month-btn" onClick={nextMonth}>{MONTH_NAMES[viewMonth === 11 ? 0 : viewMonth + 1].slice(0, 3)} →</button>
                </div>

                {/* Hero summary card */}
                <div className="card" style={{ padding: isDesktop ? "28px 36px" : "24px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: isDesktop ? 40 : 24, flexWrap: "wrap" }}>
                  <HeroDonut byCategory={byCategory} catColors={catColors} categories={sortedCategories} totalBudget={totalBudget} totalSpend={totalSpend} size={isDesktop ? 180 : 140} />
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ display: "flex", gap: isDesktop ? 40 : 20, flexWrap: "wrap", marginBottom: 20 }}>
                      <div>
                        <div style={{ fontSize: 10, color: "#334155", fontFamily: "'DM Mono',monospace", letterSpacing: 2, marginBottom: 6 }}>SPENT SO FAR</div>
                        <div style={{ fontSize: isDesktop ? 36 : 28, fontWeight: 800, color: overBudget ? "#ef4444" : "#f1f5f9", letterSpacing: -1, lineHeight: 1 }}>{fmt(totalSpend)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "#334155", fontFamily: "'DM Mono',monospace", letterSpacing: 2, marginBottom: 6 }}>TOTAL BUDGET</div>
                        <div style={{ fontSize: isDesktop ? 36 : 28, fontWeight: 800, color: "#1e3a5f", letterSpacing: -1, lineHeight: 1 }}>{fmt(totalBudget)}</div>
                      </div>
                      {!overBudget && (
                        <div>
                          <div style={{ fontSize: 10, color: "#334155", fontFamily: "'DM Mono',monospace", letterSpacing: 2, marginBottom: 6 }}>REMAINING</div>
                          <div style={{ fontSize: isDesktop ? 36 : 28, fontWeight: 800, color: "#22c55e", letterSpacing: -1, lineHeight: 1 }}>{fmt(remaining)}</div>
                        </div>
                      )}
                    </div>
                    {/* Member bars */}
                    <div style={{ display: "flex", gap: isDesktop ? 32 : 16, flexWrap: "wrap" }}>
                      {FAMILY_MEMBERS.map(m => (
                        <div key={m} style={{ minWidth: 100 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                            <span style={{ fontSize: 11, color: MEMBER_COLORS[m], fontWeight: 600 }}>{m}</span>
                            <span style={{ fontSize: 11, color: MEMBER_COLORS[m], fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{fmt(byMember[m])}</span>
                          </div>
                          <div style={{ background: "#0d1f35", borderRadius: 999, height: 4, width: 120 }}>
                            <div style={{ width: `${(byMember[m] / maxMemberSpend) * 100}%`, height: "100%", background: MEMBER_COLORS[m], borderRadius: 999, transition: "width 0.5s" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Category list + right column */}
                {isDesktop ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}>
                    {/* Categories */}
                    <div className="card" style={{ padding: "20px 24px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <div style={{ fontSize: 10, color: "#334155", fontFamily: "'DM Mono',monospace", letterSpacing: 2 }}>CATEGORIES</div>
                        {isCurrentMonth && <div style={{ fontSize: 10, color: "#1e3a5f", fontFamily: "'DM Mono',monospace", display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 2, height: 8, background: "rgba(255,255,255,0.3)", borderRadius: 1 }} /> TODAY</div>}
                      </div>
                      {/* Desktop: 2-col grid of rows */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
                        {sortedCategories.map(c => {
                          const status = categoryStatuses[c];
                          const sc = STATUS[status];
                          const spent = byCategory[c] || 0;
                          const budget = budgets[c];
                          return (
                            <div key={c} className="cat-row">
                              <div style={{ width: 8, height: 8, borderRadius: 2, background: catColors[c] || "#94a3b8", flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: "#cbd5e1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c}</span>
                                    {status !== "ok" && <span style={{ fontSize: 10, color: sc.color, fontWeight: 800 }}>{sc.icon}</span>}
                                  </div>
                                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, flexShrink: 0 }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: sc.color, fontFamily: "'DM Mono',monospace" }}>{fmt(spent)}</span>
                                    <span style={{ fontSize: 10, color: "#1e3a5f", fontFamily: "'DM Mono',monospace" }}>/ {fmt(budget)}</span>
                                  </div>
                                </div>
                                <CategoryBar spent={spent} budget={budget} color={catColors[c] || "#60a5fa"} dayOfMonth={dayOfMonth} daysInMonth={daysInMonth} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right column */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {/* Member × Category */}
                      <div className="card" style={{ padding: "18px 20px" }}>
                        <div style={{ fontSize: 10, color: "#334155", fontFamily: "'DM Mono',monospace", letterSpacing: 2, marginBottom: 14 }}>BREAKDOWN</div>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                          <thead><tr><th style={{ textAlign: "left", color: "#1e3a5f", padding: "0 0 10px", fontWeight: 500, fontSize: 11 }}>Category</th>{FAMILY_MEMBERS.map(m => (<th key={m} style={{ textAlign: "right", color: MEMBER_COLORS[m], padding: "0 0 10px 10px", fontWeight: 600, fontSize: 11 }}>{m}</th>))}</tr></thead>
                          <tbody>{categories.filter(c => (byCategory[c] || 0) > 0).map(c => (<tr key={c} style={{ borderTop: "1px solid #0d1f35" }}><td style={{ padding: "8px 0", color: "#475569", display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 5, height: 5, borderRadius: 1, background: catColors[c] || "#475569", display: "inline-block", flexShrink: 0 }} />{c}</td>{FAMILY_MEMBERS.map(m => (<td key={m} style={{ textAlign: "right", padding: "8px 0 8px 10px", color: (byMemberCategory[m] && byMemberCategory[m][c]) > 0 ? "#cbd5e1" : "#0d1f35", fontFamily: "'DM Mono',monospace", fontSize: 11 }}>{(byMemberCategory[m] && byMemberCategory[m][c]) > 0 ? fmt(byMemberCategory[m][c]) : "—"}</td>))}</tr>))}</tbody>
                        </table>
                      </div>

                      {/* Entries */}
                      <div className="card" style={{ padding: "18px 20px" }}>
                        <div style={{ fontSize: 10, color: "#334155", fontFamily: "'DM Mono',monospace", letterSpacing: 2, marginBottom: 14 }}>ENTRIES <span style={{ color: "#0d1f35", fontSize: 9 }}>· TAP TO EDIT</span></div>
                        {entries.length === 0
                          ? <div style={{ textAlign: "center", padding: "24px 0", color: "#1e3a5f", fontSize: 12 }}>No entries for {MONTH_NAMES[viewMonth]}.</div>
                          : [...entries].sort((a, b) => new Date(b.date) - new Date(a.date)).map(e => (
                            <div key={e.id} className="entry-row" onClick={() => openEditEntry(e)}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 7, background: (MEMBER_COLORS[e.member] || "#475569") + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: MEMBER_COLORS[e.member] || "#475569" }}>{e.member ? e.member[0] : "?"}</div>
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: "#cbd5e1" }}>{e.member}</div>
                                  <div style={{ fontSize: 10, color: "#334155" }}>{e.category} · {e.date.slice(0, 10)}{e.notes ? ` · ${e.notes}` : ""}</div>
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: catColors[e.category] || "#475569", fontFamily: "'DM Mono',monospace" }}>{fmtD(e.amount)}</span>
                                <span style={{ color: "#1e3a5f", fontSize: 11 }}>›</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Mobile layout */
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div className="card" style={{ padding: "18px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <div style={{ fontSize: 10, color: "#334155", fontFamily: "'DM Mono',monospace", letterSpacing: 2 }}>CATEGORIES</div>
                        {isCurrentMonth && <div style={{ fontSize: 10, color: "#1e3a5f", fontFamily: "'DM Mono',monospace" }}>| TODAY</div>}
                      </div>
                      {sortedCategories.map(c => {
                        const status = categoryStatuses[c];
                        const sc = STATUS[status];
                        const spent = byCategory[c] || 0;
                        const budget = budgets[c];
                        return (
                          <div key={c} className="cat-row">
                            <div style={{ width: 7, height: 7, borderRadius: 2, background: catColors[c] || "#94a3b8", flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>{c}</span>
                                  {status !== "ok" && <span style={{ fontSize: 10, color: sc.color, fontWeight: 800 }}>{sc.icon}</span>}
                                </div>
                                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                                  <span style={{ fontSize: 14, fontWeight: 700, color: sc.color, fontFamily: "'DM Mono',monospace" }}>{fmt(spent)}</span>
                                  <span style={{ fontSize: 10, color: "#1e3a5f", fontFamily: "'DM Mono',monospace" }}>/ {fmt(budget)}</span>
                                </div>
                              </div>
                              <CategoryBar spent={spent} budget={budget} color={catColors[c] || "#60a5fa"} dayOfMonth={dayOfMonth} daysInMonth={daysInMonth} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Member × Category */}
                    <div className="card" style={{ padding: "18px 16px" }}>
                      <div style={{ fontSize: 10, color: "#334155", fontFamily: "'DM Mono',monospace", letterSpacing: 2, marginBottom: 14 }}>BREAKDOWN</div>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead><tr><th style={{ textAlign: "left", color: "#1e3a5f", padding: "0 0 10px", fontWeight: 500 }}>Category</th>{FAMILY_MEMBERS.map(m => (<th key={m} style={{ textAlign: "right", color: MEMBER_COLORS[m], padding: "0 0 10px 10px", fontWeight: 600 }}>{m}</th>))}</tr></thead>
                        <tbody>{categories.filter(c => (byCategory[c] || 0) > 0).map(c => (<tr key={c} style={{ borderTop: "1px solid #0d1f35" }}><td style={{ padding: "8px 0", color: "#475569", display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 5, height: 5, borderRadius: 1, background: catColors[c] || "#475569", display: "inline-block" }} />{c}</td>{FAMILY_MEMBERS.map(m => (<td key={m} style={{ textAlign: "right", padding: "8px 0 8px 10px", color: (byMemberCategory[m] && byMemberCategory[m][c]) > 0 ? "#cbd5e1" : "#0d1f35", fontFamily: "'DM Mono',monospace" }}>{(byMemberCategory[m] && byMemberCategory[m][c]) > 0 ? fmt(byMemberCategory[m][c]) : "—"}</td>))}</tr>))}</tbody>
                      </table>
                    </div>

                    {/* Entries */}
                    <div className="card" style={{ padding: "18px 16px" }}>
                      <div style={{ fontSize: 10, color: "#334155", fontFamily: "'DM Mono',monospace", letterSpacing: 2, marginBottom: 14 }}>ENTRIES <span style={{ color: "#0d1f35", fontSize: 9 }}>· TAP TO EDIT</span></div>
                      {entries.length === 0
                        ? <div style={{ textAlign: "center", padding: "24px 0", color: "#1e3a5f", fontSize: 12 }}>No entries for {MONTH_NAMES[viewMonth]}.</div>
                        : [...entries].sort((a, b) => new Date(b.date) - new Date(a.date)).map(e => (
                          <div key={e.id} className="entry-row" onClick={() => openEditEntry(e)}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 30, height: 30, borderRadius: 7, background: (MEMBER_COLORS[e.member] || "#475569") + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: MEMBER_COLORS[e.member] || "#475569" }}>{e.member ? e.member[0] : "?"}</div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>{e.member}</div>
                                <div style={{ fontSize: 11, color: "#334155" }}>{e.category} · {e.date.slice(0, 10)}{e.notes ? ` · ${e.notes}` : ""}</div>
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: catColors[e.category] || "#475569", fontFamily: "'DM Mono',monospace" }}>{fmtD(e.amount)}</span>
                              <span style={{ color: "#1e3a5f", fontSize: 11 }}>›</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── ADD ── */}
            {view === "add" && (
              <div className="fade-up" style={{ maxWidth: 440, margin: "0 auto" }}>
                <div className="card" style={{ padding: 28 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Log a spend</div>
                  <div style={{ fontSize: 13, color: "#334155", marginBottom: 24 }}>Select who's spending, the category, and amount.</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    <div><FieldLabel>Who are you?</FieldLabel><MemberChips value={form.member} onChange={m => setForm(f => ({ ...f, member: m }))} /></div>
                    <div>
                      <FieldLabel>Category</FieldLabel>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                        {categories.map(c => {
                          const status = categoryStatuses[c];
                          const isSelected = form.category === c;
                          return (
                            <button key={c} className="chip" onClick={() => setForm(f => ({ ...f, category: c }))} style={{ background: isSelected ? catColors[c] + "25" : "#0a1628", border: `1px solid ${isSelected ? catColors[c] : status !== "ok" ? STATUS[status].color + "50" : "#1e293b"}`, color: isSelected ? catColors[c] : status !== "ok" ? STATUS[status].color : "#475569" }}>
                              {status !== "ok" && <span style={{ fontSize: 9 }}>{STATUS[status].icon}</span>}{c}
                            </button>
                          );
                        })}
                      </div>
                      {form.category && (
                        <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10, background: "#0a1628", border: "1px solid #0d1f35" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 6 }}>
                            <span style={{ color: "#334155" }}>{form.category}</span>
                            <span style={{ color: STATUS[categoryStatuses[form.category]].color, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{fmt(byCategory[form.category] || 0)} / {fmt(budgets[form.category])}</span>
                          </div>
                          <CategoryBar spent={byCategory[form.category] || 0} budget={budgets[form.category]} color={catColors[form.category] || "#60a5fa"} dayOfMonth={dayOfMonth} daysInMonth={daysInMonth} />
                        </div>
                      )}
                    </div>
                    <div><FieldLabel>Amount</FieldLabel><div style={{ position: "relative" }}><span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#334155", fontSize: 15 }}>$</span><input className="inp" type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={{ paddingLeft: 30, fontSize: 16 }} /></div></div>
                    <div><FieldLabel>Notes (optional)</FieldLabel><textarea className="inp" placeholder="e.g. Costco run, monthly subscription…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ resize: "none", lineHeight: 1.5 }} /></div>
                    <button className="cta" onClick={handleAddSubmit} disabled={syncing}>{syncing ? "Saving…" : "Log Spend"}</button>
                  </div>
                </div>
              </div>
            )}

            {/* ── BUDGET DETAILS ── */}
            {view === "budgets" && (
              <div className="fade-up" style={{ maxWidth: 520, margin: "0 auto" }}>
                <div className="card" style={{ padding: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>Categories</div>
                    <button onClick={openNewCat} style={{ background: "#0f2040", border: "1px solid #1e3a5f", borderRadius: 8, color: "#60a5fa", fontSize: 12, fontWeight: 600, padding: "7px 14px", cursor: "pointer", fontFamily: "'Sora',sans-serif" }}>+ New</button>
                  </div>
                  {categories.map(c => {
                    const status = categoryStatuses[c];
                    const sc = STATUS[status];
                    return (
                      <div key={c} onClick={() => openEditCat(c)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 8px", borderBottom: "1px solid #0d1f35", cursor: "pointer", borderRadius: 8, transition: "background 0.12s" }} onMouseEnter={e => e.currentTarget.style.background = "#0a1628"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 3, background: catColors[c] || "#475569", flexShrink: 0 }} />
                          <span style={{ fontSize: 14, color: "#cbd5e1", fontWeight: 600 }}>{c}</span>
                          {status !== "ok" && <span style={{ fontSize: 10, color: sc.color, fontWeight: 800 }}>{sc.icon}</span>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: sc.color, fontFamily: "'DM Mono',monospace" }}>{fmt(byCategory[c] || 0)}</span>
                          <span style={{ fontSize: 11, color: "#1e3a5f", fontFamily: "'DM Mono',monospace" }}>/ {fmt(budgets[c])}</span>
                          <span style={{ color: "#1e3a5f" }}>›</span>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ marginTop: 16, padding: "12px 14px", background: "#0a1628", borderRadius: 10, border: "1px solid #0d1f35", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "#334155", fontWeight: 600 }}>Total budget</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#cbd5e1", fontFamily: "'DM Mono',monospace" }}>{fmt(totalBudget)} / month</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── LONG TERM ── */}
            {view === "longterm" && (
              <div className="fade-up">
                {longTerm.length === 0
                  ? <div style={{ textAlign: "center", padding: "60px 0", color: "#1e3a5f", fontSize: 13 }}>No goals yet. Add one below.</div>
                  : (
                    <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : "1fr", gap: 14 }}>
                      {longTerm.map((item, i) => {
                        const pct = item.goal > 0 ? Math.min(item.saved / item.goal, 1) : 0;
                        const color = ltColor(item, i);
                        const remaining = Math.max(item.goal - item.saved, 0);
                        const done = item.saved >= item.goal;
                        let pacingPct = null;
                        if (item.targetDate && item.targetDate !== '' && item.goal > 0 && !done) {
                          const now2 = new Date();
                          const target = new Date(item.targetDate + '-01');
                          const start = item.startDate && item.startDate !== '' ? new Date(item.startDate + '-01') : new Date(now2.getFullYear(), now2.getMonth() - 1, 1);
                          const totalDur = target - start;
                          const elapsed = now2 - start;
                          if (totalDur > 0 && elapsed >= 0) pacingPct = Math.min(elapsed / totalDur, 0.98);
                        }
                        return (
                          <div key={i} className="lt-card" onClick={() => openEditLT(i)}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{item.name}</div>
                              <span style={{ fontSize: 10, color: "#1e3a5f", fontFamily: "'DM Mono',monospace" }}>edit ›</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                              <div style={{ position: "relative", flexShrink: 0 }}>
                                <DonutChart saved={item.saved} goal={item.goal} color={color} />
                                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <div style={{ fontSize: 13, fontWeight: 700, color, fontFamily: "'DM Mono',monospace" }}>{Math.round(pct * 100)}%</div>
                                </div>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                {done ? (
                                  <div style={{ background: color + "15", border: `1px solid ${color}35`, borderRadius: 10, padding: "10px 12px" }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 4 }}>🎉 Goal reached!</div>
                                    <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.5 }}>You can now put extra funds towards other goals!</div>
                                  </div>
                                ) : (
                                  <>
                                    <div style={{ display: "flex", gap: 14, marginBottom: 8 }}>
                                      <div><div style={{ fontSize: 9, color: "#334155", fontFamily: "'DM Mono',monospace", letterSpacing: 1, marginBottom: 2 }}>SAVED</div><div style={{ fontSize: 16, fontWeight: 700, color, fontFamily: "'DM Mono',monospace" }}>{fmt(item.saved)}</div></div>
                                      <div><div style={{ fontSize: 9, color: "#334155", fontFamily: "'DM Mono',monospace", letterSpacing: 1, marginBottom: 2 }}>GOAL</div><div style={{ fontSize: 16, fontWeight: 600, color: "#334155", fontFamily: "'DM Mono',monospace" }}>{fmt(item.goal)}</div></div>
                                    </div>
                                    <div style={{ fontSize: 10, color: "#334155", fontFamily: "'DM Mono',monospace" }}>
                                      {fmt(remaining)} to go{item.targetDate ? ` · ${new Date(item.targetDate + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : ''}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                            <div style={{ marginTop: 14, background: "#0d1f35", borderRadius: 999, height: 4, position: "relative" }}>
                              <div style={{ width: `${pct * 100}%`, height: "100%", background: color, borderRadius: 999, transition: "width 0.5s" }} />
                              {pacingPct !== null && <div style={{ position: "absolute", top: -3, bottom: -3, left: `${pacingPct * 100}%`, width: 2, background: "rgba(255,255,255,0.5)", borderRadius: 1, transform: "translateX(-50%)" }} />}
                            </div>
                            {pacingPct !== null && <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}><span style={{ fontSize: 9, color: "#1e3a5f", fontFamily: "'DM Mono',monospace", letterSpacing: 1 }}>— EXPECTED TODAY</span></div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                <div style={{ marginTop: 16, background: "#0a1628", border: "1px dashed #0d1f35", borderRadius: 14, padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                  <div style={{ fontSize: 13, color: "#334155" }}>Looking to track a new long-term goal?</div>
                  <button onClick={openNewLT} style={{ background: "#1d4ed8", border: "none", borderRadius: 9, color: "#fff", fontSize: 12, fontWeight: 700, padding: "9px 20px", cursor: "pointer", fontFamily: "'Sora',sans-serif", whiteSpace: "nowrap" }}>Add</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
