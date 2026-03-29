import { useState, useMemo, useEffect, useCallback } from "react";

const API_URL = "https://script.google.com/macros/s/AKfycbx_4rXo6btDrTaoiIu5OcorS5WdsnPyGGjYuDVQm6uiyxb0uXK4zy5do9Jv0lm3ZYiomg/exec";

const FAMILY_MEMBERS = ["Matt", "Alice"];
const PALETTE = ["#4ade80","#f97316","#60a5fa","#a78bfa","#f472b6","#34d399","#fbbf24","#94a3b8","#fb7185","#38bdf8","#c084fc","#fdba74","#86efac","#67e8f9","#fde68a","#d8b4fe"];
const MEMBER_COLORS = { "Matt": "#60a5fa", "Alice": "#f472b6" };
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }

// Within $2 of budget (over or under) = ok. Only flag if clearly over or pacing badly.
function getCategoryStatus(spent, budget, dayOfMonth, daysInMonth) {
  const progress = dayOfMonth / daysInMonth;
  // Exactly at or near budget (within $2 either way) = green
  if (Math.abs(spent - budget) <= 2) return "ok";
  if (spent > budget + 2) return "over";
  // Pacing: only warn if projected overage is more than $2 AND spent is more than 20% of budget
  // (avoids flagging small early fixed costs)
  const proj = spent / progress;
  if (spent >= budget * 0.2 && proj >= budget + 2) return "risk";
  if (spent >= budget * 0.2 && proj >= budget * 0.85) return "warn";
  return "ok";
}

const STATUS_ICON = {
  ok:   { icon: "✓", color: "#4ade80" },
  warn: { icon: "↑", color: "#eab308" },
  risk: { icon: "↑", color: "#f97316" },
  over: { icon: "!", color: "#ef4444" },
};

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 900);
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 900);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isDesktop;
}

function StatusIcon({ status }) {
  const s = STATUS_ICON[status];
  return <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:18, height:18, borderRadius:"50%", background:s.color+"20", color:s.color, fontSize:11, fontWeight:800, fontFamily:"'DM Mono', monospace", flexShrink:0 }}>{s.icon}</span>;
}

function BudgetBar({ spent, budget, dayOfMonth, daysInMonth }) {
  const progress = dayOfMonth / daysInMonth;
  const pct = Math.min((spent / budget) * 100, 100);
  const status = getCategoryStatus(spent, budget, dayOfMonth, daysInMonth);
  const projPct = Math.min((spent / progress / budget) * 100, 100);
  const barColor = status === "ok" ? "#22c55e" : status === "warn" ? "#eab308" : status === "risk" ? "#f97316" : "#ef4444";
  return (
    <div style={{ background:"#1e293b", borderRadius:999, height:6, position:"relative" }}>
      {status !== "over" && <div style={{ position:"absolute", left:0, top:0, width:`${projPct}%`, height:"100%", background:barColor+"28", borderRadius:999 }} />}
      <div style={{ position:"absolute", left:0, top:0, width:`${pct}%`, height:"100%", background:barColor, borderRadius:999, transition:"width 0.5s" }} />
      <div style={{ position:"absolute", top:-3, bottom:-3, left:`${progress*100}%`, width:2, background:"rgba(255,255,255,0.5)", borderRadius:1, transform:"translateX(-50%)" }} />
    </div>
  );
}

function StatCard({ label, value, sub, accent, flag }) {
  return (
    <div style={{ background:"#0f172a", border:`1px solid ${flag?"#7f1d1d":accent+"30"}`, borderRadius:16, padding:"14px 18px" }}>
      <div style={{ fontSize:11, color:"#64748b", textTransform:"uppercase", letterSpacing:2, marginBottom:6, fontFamily:"'DM Mono', monospace" }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:700, color:flag?"#ef4444":"#f1f5f9" }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:"#475569", marginTop:4 }}>{sub}</div>}
    </div>
  );
}

function Modal({ onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={onClose}>
      <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:20, padding:28, width:"100%", maxWidth:420, maxHeight:"90vh", overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:80, gap:16 }}>
      <div style={{ width:36, height:36, border:"3px solid #1e293b", borderTop:"3px solid #3b82f6", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <div style={{ color:"#475569", fontSize:13, fontFamily:"'DM Mono', monospace" }}>Loading from Google Sheets…</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// Display-only category card for dashboard (no onClick edit)
function CategoryCard({ c, status, catColors, byCategory, budgets, dayOfMonth, daysInMonth, isCurrentMonth }) {
  const iconColor = STATUS_ICON[status].color;
  const spent = byCategory[c] || 0;
  const budget = budgets[c];
  const projected = Math.round(spent / (dayOfMonth / daysInMonth));
  const fmt = n => `$${Math.round(n).toLocaleString("en-US")}`;
  return (
    <div style={{ background:"#0a0f1e", border:`1px solid ${status !== "ok" ? iconColor+"40" : "#1e293b"}`, borderRadius:14, padding:"12px 14px" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
          <div style={{ width:10, height:10, borderRadius:3, background:catColors[c]||"#94a3b8", flexShrink:0 }} />
          <span style={{ fontSize:12, fontWeight:700, color:"#e2e8f0" }}>{c}</span>
        </div>
        <StatusIcon status={status} />
      </div>
      <BudgetBar spent={spent} budget={budget} dayOfMonth={dayOfMonth} daysInMonth={daysInMonth} />
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginTop:6 }}>
        <span style={{ fontSize:14, fontWeight:700, color:iconColor, fontFamily:"'DM Mono', monospace" }}>{fmt(spent)}</span>
        <span style={{ fontSize:10, color:"#334155", fontFamily:"'DM Mono', monospace" }}>of {fmt(budget)}</span>
      </div>
      {status !== "ok" && isCurrentMonth && (
        <div style={{ fontSize:10, color:iconColor, marginTop:4, fontFamily:"'DM Mono', monospace", opacity:0.75 }}>
          {status === "over" ? `${fmt(spent - budget)} over` : `EOM: ~${fmt(projected)}`}
        </div>
      )}
    </div>
  );
}

// SVG donut chart for long term savings
function DonutChart({ saved, goal, color }) {
  const pct = goal > 0 ? Math.min(saved / goal, 1) : 0;
  const r = 40, cx = 50, cy = 50, stroke = 10;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  return (
    <svg viewBox="0 0 100 100" style={{ width:100, height:100, transform:"rotate(-90deg)" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition:"stroke-dasharray 0.6s cubic-bezier(.4,0,.2,1)" }} />
    </svg>
  );
}

export default function App() {
  const isDesktop = useIsDesktop();
  const [allEntries, setAllEntries] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [catColors, setCatColors] = useState({});
  const [longTerm, setLongTerm] = useState([]); // [{name, saved, goal}]
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState("dashboard");
  const [toast, setToast] = useState(null);
  const [nextId, setNextId] = useState(1);
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [form, setForm] = useState({ member:"", category:"", amount:"" });
  const [editEntry, setEditEntry] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editCat, setEditCat] = useState(null);
  const [catForm, setCatForm] = useState({ name:"", budget:"", color:PALETTE[0] });
  const [editLT, setEditLT] = useState(null); // index or "new"
  const [ltForm, setLtForm] = useState({ name:"", saved:"", goal:"", color:PALETTE[0], targetDate:"", startDate:"" });

  const categories = useMemo(() => Object.keys(budgets), [budgets]);
  const showToast = useCallback((msg, ok=true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); }, []);

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
      const entries = (data.entries || []).filter(r => r[0]).map(r => ({ id:String(r[0]), date:String(r[1]), member:String(r[2]), category:String(r[3]), amount:parseFloat(r[4]) }));
      const budgetMap = {}, colorMap = {};
      (data.budgets || []).forEach(r => { if (r[0]) { budgetMap[String(r[0])] = parseFloat(r[1]); colorMap[String(r[0])] = String(r[2]); } });
      const lt = (data.longTerm || []).filter(r => r[0]).map(r => ({ name:String(r[0]), saved:parseFloat(r[1])||0, goal:parseFloat(r[2])||0, color:String(r[3]||''), targetDate:String(r[4]||''), startDate:String(r[5]||'') }));
      setAllEntries(entries); setBudgets(budgetMap); setCatColors(colorMap); setLongTerm(lt);
      setNextId(entries.reduce((m, e) => Math.max(m, parseInt(e.id)||0), 0) + 1);
    } catch(err) { setError("Couldn't connect to Google Sheets. " + err.message); }
    finally { setLoading(false); }
  }, [api]);

  useEffect(() => { loadData(); }, [loadData]);

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const dayOfMonth = isCurrentMonth ? now.getDate() : daysInMonth;

  const entries = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}`;
    return allEntries.filter(e => e.date.startsWith(prefix));
  }, [allEntries, viewYear, viewMonth]);

  const fmt = n => `$${Math.round(n).toLocaleString("en-US")}`;
  const fmtD = n => `$${(+n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;

  const totalSpend = useMemo(() => entries.reduce((s,e)=>s+e.amount,0), [entries]);
  const totalBudget = useMemo(() => Object.values(budgets).reduce((s,v)=>s+v,0), [budgets]);
  const byMember = useMemo(() => { const map={}; FAMILY_MEMBERS.forEach(m=>map[m]=0); entries.forEach(e=>{map[e.member]=(map[e.member]||0)+e.amount;}); return map; }, [entries]);
  const byCategory = useMemo(() => { const map={}; categories.forEach(c=>map[c]=0); entries.forEach(e=>{if(map[e.category]!==undefined) map[e.category]+=e.amount;}); return map; }, [entries, categories]);
  const byMemberCategory = useMemo(() => { const map={}; FAMILY_MEMBERS.forEach(m=>{map[m]={};categories.forEach(c=>{map[m][c]=0;}); }); entries.forEach(e=>{if(map[e.member]&&map[e.member][e.category]!==undefined) map[e.member][e.category]+=e.amount;}); return map; }, [entries, categories]);
  const categoryStatuses = useMemo(() => { const map={}; categories.forEach(c=>{map[c]=getCategoryStatus(byCategory[c]||0,budgets[c],dayOfMonth,daysInMonth);}); return map; }, [byCategory, budgets, dayOfMonth, daysInMonth, categories]);
  const alertCount = useMemo(() => Object.values(categoryStatuses).filter(s=>s!=="ok").length, [categoryStatuses]);
  const overCount = useMemo(() => Object.values(categoryStatuses).filter(s=>s==="over").length, [categoryStatuses]);
  const maxMemberSpend = Math.max(...Object.values(byMember), 1);
  const sortedCategories = useMemo(() => [...categories].sort((a,b)=>({over:0,risk:1,warn:2,ok:3})[categoryStatuses[a]]-({over:0,risk:1,warn:2,ok:3})[categoryStatuses[b]]), [categories, categoryStatuses]);

  // Fallback color for long term items that have no color set
  const ltColor = (item, i) => item.color && item.color !== '' ? item.color : PALETTE[i % PALETTE.length];

  // Long term totals
  const ltTotalSaved = useMemo(() => longTerm.reduce((s,i)=>s+i.saved,0), [longTerm]);
  const ltTotalGoal = useMemo(() => longTerm.reduce((s,i)=>s+i.goal,0), [longTerm]);

  function prevMonth() { if (viewMonth === 0) { setViewMonth(11); setViewYear(y=>y-1); } else setViewMonth(m=>m-1); }
  function nextMonth() { if (isCurrentMonth) return; if (viewMonth === 11) { setViewMonth(0); setViewYear(y=>y+1); } else setViewMonth(m=>m+1); }

  async function handleAddSubmit() {
    if (!form.member||!form.category||!form.amount||isNaN(+form.amount)||+form.amount<=0) { showToast("Please fill all fields.", false); return; }
    const entry = { id:String(nextId), member:form.member, category:form.category, amount:parseFloat((+form.amount).toFixed(2)), date:new Date().toISOString().split("T")[0] };
    setSyncing(true);
    try { await api({ action:"addEntry", ...entry }); setAllEntries(prev=>[entry,...prev]); setNextId(n=>n+1); setForm({member:"",category:"",amount:""}); showToast(`${fmtD(entry.amount)} logged for ${entry.member}.`); setView("dashboard"); }
    catch { showToast("Failed to save.", false); } finally { setSyncing(false); }
  }

  function openEditEntry(e) { setEditEntry(e); setEditForm({member:e.member,category:e.category,amount:String(e.amount),date:e.date}); }
  async function saveEditEntry() {
    if (!editForm.member||!editForm.category||!editForm.amount||isNaN(+editForm.amount)||+editForm.amount<=0) { showToast("Please fill all fields.", false); return; }
    const updated = {...editEntry,...editForm,amount:parseFloat((+editForm.amount).toFixed(2))};
    setSyncing(true);
    try { await api({ action:"updateEntry", ...updated }); setAllEntries(prev=>prev.map(e=>e.id===editEntry.id?updated:e)); setEditEntry(null); showToast("Entry updated."); }
    catch { showToast("Failed to update.", false); } finally { setSyncing(false); }
  }
  async function deleteEntry(id) {
    setSyncing(true);
    try { await api({ action:"deleteEntry", id }); setAllEntries(prev=>prev.filter(e=>e.id!==id)); setEditEntry(null); showToast("Entry deleted."); }
    catch { showToast("Failed to delete.", false); } finally { setSyncing(false); }
  }

  async function saveBudgetsToSheet(nb, nc) {
    try { await api({ action:"saveBudgets", budgets:JSON.stringify(Object.keys(nb).map(c=>({category:c,budget:nb[c],color:nc[c]||PALETTE[0]}))) }); }
    catch { showToast("Budgets saved locally but failed to sync.", false); }
  }

  function openNewCat() { setCatForm({name:"",budget:"",color:PALETTE.find(p=>!Object.values(catColors).includes(p))||PALETTE[0]}); setEditCat("new"); }
  function openEditCat(name) { setCatForm({name,budget:String(budgets[name]),color:catColors[name]}); setEditCat(name); }
  async function saveCat() {
    const name = catForm.name.trim();
    if (!name||!catForm.budget||isNaN(+catForm.budget)||+catForm.budget<=0) { showToast("Please enter a name and valid budget.",false); return; }
    let nb={...budgets}, nc={...catColors};
    if (editCat==="new") { if (budgets[name]) { showToast("Already exists.",false); return; } nb[name]=parseFloat((+catForm.budget).toFixed(2)); nc[name]=catForm.color; }
    else { if (name!==editCat&&budgets[name]) { showToast("Name taken.",false); return; } if (name!==editCat) { nb[name]=nb[editCat]; delete nb[editCat]; nc[name]=nc[editCat]; delete nc[editCat]; setAllEntries(prev=>prev.map(e=>e.category===editCat?{...e,category:name}:e)); } nb[name]=parseFloat((+catForm.budget).toFixed(2)); nc[name]=catForm.color; }
    setBudgets(nb); setCatColors(nc); setEditCat(null); showToast(editCat==="new"?`"${name}" added.`:"Category updated.");
    await saveBudgetsToSheet(nb, nc);
  }
  async function deleteCat(catName) {
    if (categories.length<=1) { showToast("Can't delete the last category.",false); return; }
    const nb={...budgets}; delete nb[catName]; const nc={...catColors}; delete nc[catName];
    setBudgets(nb); setCatColors(nc); setAllEntries(prev=>prev.filter(e=>e.category!==catName)); setEditCat(null); showToast(`"${catName}" deleted.`);
    await saveBudgetsToSheet(nb, nc);
  }

  // Long Term CRUD
  function openNewLT() { const todayStr = new Date().toISOString().slice(0,7); setLtForm({name:"",saved:"",goal:"",color:PALETTE[0],targetDate:"",startDate:todayStr}); setEditLT("new"); }
  function openEditLT(i) { setLtForm({name:longTerm[i].name,saved:String(longTerm[i].saved),goal:String(longTerm[i].goal),color:longTerm[i].color||PALETTE[0],targetDate:longTerm[i].targetDate||"",startDate:longTerm[i].startDate||""}); setEditLT(i); }
  async function saveLT() {
    const name = ltForm.name.trim();
    if (!name||ltForm.saved===""||ltForm.goal===""||isNaN(+ltForm.saved)||isNaN(+ltForm.goal)) { showToast("Please fill all fields.",false); return; }
    let next = [...longTerm];
    const item = { name, saved:parseFloat((+ltForm.saved).toFixed(2)), goal:parseFloat((+ltForm.goal).toFixed(2)), color:ltForm.color||PALETTE[0], targetDate:ltForm.targetDate||"", startDate:ltForm.startDate||"" };
    if (editLT==="new") { next.push(item); }
    else { next[editLT] = item; }
    setLongTerm(next); setEditLT(null);
    showToast(editLT==="new"?`"${name}" added.`:"Updated.");
    setSyncing(true);
    try { await api({ action:"saveLongTerm", items:JSON.stringify(next) }); }
    catch { showToast("Saved locally but failed to sync.",false); }
    finally { setSyncing(false); }
  }
  async function deleteLT(i) {
    const next = longTerm.filter((_,idx)=>idx!==i);
    setLongTerm(next); setEditLT(null); showToast("Deleted.");
    setSyncing(true);
    try { await api({ action:"saveLongTerm", items:JSON.stringify(next) }); }
    catch { showToast("Deleted locally but failed to sync.",false); }
    finally { setSyncing(false); }
  }

  const mw = isDesktop ? 1320 : 700;

  const MemberSection = () => (
    <div style={{ background:"#0f172a", borderRadius:16, padding:18, border:"1px solid #1e293b" }}>
      <div style={{ fontSize:11, fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:2, marginBottom:14, fontFamily:"'DM Mono',monospace" }}>Spend by Member</div>
      {FAMILY_MEMBERS.map(m=>(
        <div key={m} style={{ marginBottom:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}><div style={{ width:8, height:8, borderRadius:"50%", background:MEMBER_COLORS[m] }} /><span style={{ fontSize:14, fontWeight:600, color:"#e2e8f0" }}>{m}</span></div>
            <span style={{ fontSize:14, fontWeight:700, color:MEMBER_COLORS[m], fontFamily:"'DM Mono',monospace" }}>{fmtD(byMember[m])}</span>
          </div>
          <div style={{ background:"#1e293b", borderRadius:999, height:6 }}><div style={{ width:`${(byMember[m]/maxMemberSpend)*100}%`, height:"100%", background:MEMBER_COLORS[m], borderRadius:999, transition:"width 0.5s" }} /></div>
        </div>
      ))}
    </div>
  );

  const TableSection = () => (
    <div style={{ background:"#0f172a", borderRadius:16, padding:18, border:"1px solid #1e293b" }}>
      <div style={{ fontSize:11, fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:2, marginBottom:14, fontFamily:"'DM Mono',monospace" }}>Member × Category</div>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead><tr><th style={{ textAlign:"left", color:"#475569", padding:"0 0 12px", fontWeight:600 }}>Category</th>{FAMILY_MEMBERS.map(m=>(<th key={m} style={{ textAlign:"right", color:MEMBER_COLORS[m], padding:"0 0 12px 12px", fontWeight:600 }}>{m}</th>))}</tr></thead>
          <tbody>{categories.filter(c=>(byCategory[c]||0)>0).map(c=>(<tr key={c} style={{ borderTop:"1px solid #1e293b" }}><td style={{ padding:"9px 0", color:"#94a3b8", display:"flex", alignItems:"center", gap:6 }}><span style={{ width:6, height:6, borderRadius:1, background:catColors[c]||"#94a3b8", display:"inline-block" }} />{c}</td>{FAMILY_MEMBERS.map(m=>(<td key={m} style={{ textAlign:"right", padding:"9px 0 9px 12px", color:(byMemberCategory[m]&&byMemberCategory[m][c])>0?"#e2e8f0":"#1e293b", fontFamily:"'DM Mono',monospace" }}>{(byMemberCategory[m]&&byMemberCategory[m][c])>0?fmt(byMemberCategory[m][c]):"—"}</td>))}</tr>))}</tbody>
        </table>
      </div>
    </div>
  );

  const EntriesSection = () => (
    <div style={{ background:"#0f172a", borderRadius:16, padding:18, border:"1px solid #1e293b" }}>
      <div style={{ fontSize:11, fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:2, marginBottom:12, fontFamily:"'DM Mono',monospace" }}>Entries <span style={{ color:"#334155", fontSize:10, fontWeight:400 }}>· tap to edit</span></div>
      {entries.length===0 ? <div style={{ textAlign:"center", padding:"32px 0", color:"#334155", fontSize:13 }}>No entries for {MONTH_NAMES[viewMonth]}.</div>
      : entries.slice(0,12).map(e=>(
        <div key={e.id} className="entry-row" onClick={()=>openEditEntry(e)}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:(MEMBER_COLORS[e.member]||"#475569")+"20", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:MEMBER_COLORS[e.member]||"#475569" }}>{e.member?e.member[0]:"?"}</div>
            <div><div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{e.member}</div><div style={{ fontSize:11, color:"#475569" }}>{e.category} · {e.date}</div></div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ fontSize:15, fontWeight:700, color:catColors[e.category]||"#94a3b8", fontFamily:"'DM Mono',monospace" }}>{fmtD(e.amount)}</div>
            <span style={{ color:"#334155", fontSize:12 }}>›</span>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#020817", fontFamily:"'Sora','DM Mono',sans-serif", color:"#f1f5f9", paddingBottom:48 }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing:border-box; margin:0; padding:0; }
        .tab-btn { background:none; border:none; cursor:pointer; font-family:'Sora',sans-serif; font-size:13px; font-weight:600; padding:9px 15px; border-radius:10px; transition:all 0.2s; }
        .tab-btn.active { background:#1e40af; color:#fff; }
        .tab-btn:not(.active) { color:#475569; }
        .tab-btn:not(.active):hover { color:#94a3b8; }
        .input-field { width:100%; background:#0a0f1e; border:1px solid #1e293b; border-radius:12px; padding:13px 16px; color:#f1f5f9; font-family:'Sora',sans-serif; font-size:14px; outline:none; transition:border 0.2s; appearance:none; }
        .input-field:focus { border-color:#3b82f6; }
        .chip { display:inline-flex; align-items:center; gap:5px; padding:6px 13px; border-radius:999px; font-size:12px; font-weight:600; border:none; cursor:pointer; font-family:'Sora',sans-serif; transition:all 0.15s; }
        .submit-btn { width:100%; padding:15px; border-radius:13px; border:none; background:linear-gradient(135deg,#1d4ed8,#7c3aed); color:#fff; font-size:15px; font-weight:700; font-family:'Sora',sans-serif; cursor:pointer; transition:opacity 0.2s,transform 0.1s; }
        .submit-btn:hover { opacity:0.9; transform:translateY(-1px); }
        .submit-btn:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
        .entry-row { display:flex; align-items:center; justify-content:space-between; padding:11px 8px; border-bottom:1px solid #0f172a; gap:8px; cursor:pointer; border-radius:8px; transition:background 0.15s; }
        .entry-row:last-child { border-bottom:none; }
        .entry-row:hover { background:#0f172a88; }
        .danger-btn { background:#450a0a; border:1px solid #7f1d1d; color:#f87171; border-radius:8px; padding:8px 16px; font-family:'Sora',sans-serif; font-size:13px; font-weight:600; cursor:pointer; }
        .color-swatch { width:22px; height:22px; border-radius:6px; cursor:pointer; border:2px solid transparent; transition:transform 0.1s; flex-shrink:0; }
        .color-swatch:hover { transform:scale(1.15); }
        .month-btn { background:none; border:1px solid #1e293b; color:#94a3b8; border-radius:8px; padding:5px 12px; cursor:pointer; font-family:'DM Mono',monospace; font-size:13px; transition:all 0.15s; }
        .month-btn:hover:not(:disabled) { border-color:#3b82f6; color:#3b82f6; }
        .month-btn:disabled { opacity:0.25; cursor:default; }
        .lt-card { background:#0a0f1e; border:1px solid #1e293b; border-radius:14px; padding:20px; cursor:pointer; transition:background 0.15s; }
        .lt-card:hover { background:#0f172a; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .fade-in { animation:fadeIn 0.3s ease; }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .slide-up { animation:slideUp 0.4s cubic-bezier(.4,0,.2,1); }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>

      {/* Header */}
      <div style={{ background:"#0a0f1e", borderBottom:"1px solid #1e293b", padding:"0 16px" }}>
        <div style={{ maxWidth:mw, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:64 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:700, letterSpacing:-0.5, display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ color:"#3b82f6" }}>family</span>budget
              {alertCount>0 && <span style={{ background:overCount>0?"#ef444422":"#f9731622", color:overCount>0?"#ef4444":"#f97316", border:`1px solid ${overCount>0?"#7f1d1d":"#7c2d12"}`, fontSize:10, fontWeight:800, borderRadius:999, padding:"2px 8px", fontFamily:"'DM Mono',monospace" }}>{alertCount}</span>}
              {syncing && <span style={{ fontSize:10, color:"#475569", fontFamily:"'DM Mono',monospace" }}>syncing…</span>}
            </div>
            <div style={{ fontSize:11, color:"#334155", fontFamily:"'DM Mono',monospace", marginTop:1 }}>{MONTH_NAMES[viewMonth].toUpperCase()} {viewYear} · DAY {dayOfMonth}/{daysInMonth}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ display:"flex", gap:4, background:"#0f172a", borderRadius:12, padding:4 }}>
              <button className={`tab-btn ${view==="dashboard"?"active":""}`} onClick={()=>setView("dashboard")}>Budget Dashboard</button>
              <button className={`tab-btn ${view==="longterm"?"active":""}`} onClick={()=>setView("longterm")}>Long Term Goals</button>
              <button className={`tab-btn ${view==="budgets"?"active":""}`} onClick={()=>setView("budgets")}>Budget Details</button>
            </div>
            <button onClick={()=>setView("add")} style={{ background: view==="add" ? "#1d4ed8" : "linear-gradient(135deg,#1d4ed8,#7c3aed)", border:"none", borderRadius:10, color:"#fff", fontSize:13, fontWeight:700, padding:"9px 16px", cursor:"pointer", fontFamily:"'Sora',sans-serif", whiteSpace:"nowrap" }}>+ Add</button>
          </div>
        </div>
      </div>

      {toast && <div style={{ position:"fixed", top:20, left:"50%", transform:"translateX(-50%)", background:toast.ok?"#052e16":"#450a0a", border:`1px solid ${toast.ok?"#16a34a":"#dc2626"}`, color:toast.ok?"#4ade80":"#f87171", padding:"11px 22px", borderRadius:12, fontSize:13, fontWeight:600, zIndex:500, boxShadow:"0 8px 32px rgba(0,0,0,0.5)", animation:"slideUp 0.3s ease", maxWidth:320, textAlign:"center" }}>{toast.msg}</div>}

      {/* Edit Entry Modal */}
      {editEntry && (
        <Modal onClose={()=>setEditEntry(null)}>
          <div style={{ fontSize:17, fontWeight:700, marginBottom:4 }}>Edit Entry</div>
          <div style={{ fontSize:12, color:"#475569", marginBottom:22 }}>Update or delete this entry.</div>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div><div style={{ fontSize:11, color:"#64748b", fontFamily:"'DM Mono',monospace", textTransform:"uppercase", letterSpacing:1.5, marginBottom:7 }}>Member</div><div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>{FAMILY_MEMBERS.map(m=>(<button key={m} className="chip" onClick={()=>setEditForm(f=>({...f,member:m}))} style={{ background:editForm.member===m?MEMBER_COLORS[m]+"25":"#0a0f1e", border:`1px solid ${editForm.member===m?MEMBER_COLORS[m]:"#1e293b"}`, color:editForm.member===m?MEMBER_COLORS[m]:"#475569" }}>{m}</button>))}</div></div>
            <div><div style={{ fontSize:11, color:"#64748b", fontFamily:"'DM Mono',monospace", textTransform:"uppercase", letterSpacing:1.5, marginBottom:7 }}>Category</div><div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>{categories.map(c=>(<button key={c} className="chip" onClick={()=>setEditForm(f=>({...f,category:c}))} style={{ background:editForm.category===c?catColors[c]+"20":"#0a0f1e", border:`1px solid ${editForm.category===c?catColors[c]:"#1e293b"}`, color:editForm.category===c?catColors[c]:"#475569" }}>{c}</button>))}</div></div>
            <div><div style={{ fontSize:11, color:"#64748b", fontFamily:"'DM Mono',monospace", textTransform:"uppercase", letterSpacing:1.5, marginBottom:7 }}>Amount</div><div style={{ position:"relative" }}><span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"#475569" }}>$</span><input className="input-field" type="number" min="0" step="0.01" value={editForm.amount} onChange={e=>setEditForm(f=>({...f,amount:e.target.value}))} style={{ paddingLeft:28 }} /></div></div>
            <div><div style={{ fontSize:11, color:"#64748b", fontFamily:"'DM Mono',monospace", textTransform:"uppercase", letterSpacing:1.5, marginBottom:7 }}>Date</div><input className="input-field" type="date" value={editForm.date} onChange={e=>setEditForm(f=>({...f,date:e.target.value}))} /></div>
            <div style={{ display:"flex", gap:10, marginTop:6 }}><button className="submit-btn" onClick={saveEditEntry} disabled={syncing} style={{ flex:1 }}>Save Changes</button><button className="danger-btn" onClick={()=>deleteEntry(editEntry.id)} disabled={syncing}>Delete</button></div>
          </div>
        </Modal>
      )}

      {/* Edit Category Modal */}
      {editCat!==null && (
        <Modal onClose={()=>setEditCat(null)}>
          <div style={{ fontSize:17, fontWeight:700, marginBottom:4 }}>{editCat==="new"?"New Category":"Edit Category"}</div>
          <div style={{ fontSize:12, color:"#475569", marginBottom:22 }}>{editCat==="new"?"Add a new spending category.":"Rename, recolor, or delete."}</div>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div><div style={{ fontSize:11, color:"#64748b", fontFamily:"'DM Mono',monospace", textTransform:"uppercase", letterSpacing:1.5, marginBottom:7 }}>Name</div><input className="input-field" type="text" placeholder="e.g. Subscriptions" value={catForm.name} onChange={e=>setCatForm(f=>({...f,name:e.target.value}))} /></div>
            <div><div style={{ fontSize:11, color:"#64748b", fontFamily:"'DM Mono',monospace", textTransform:"uppercase", letterSpacing:1.5, marginBottom:7 }}>Monthly Budget</div><div style={{ position:"relative" }}><span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"#475569" }}>$</span><input className="input-field" type="number" min="0" placeholder="0" value={catForm.budget} onChange={e=>setCatForm(f=>({...f,budget:e.target.value}))} style={{ paddingLeft:28 }} /></div></div>
            <div><div style={{ fontSize:11, color:"#64748b", fontFamily:"'DM Mono',monospace", textTransform:"uppercase", letterSpacing:1.5, marginBottom:10 }}>Color</div><div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>{PALETTE.map(p=>(<div key={p} className="color-swatch" style={{ background:p, borderColor:catForm.color===p?"#fff":"transparent", boxShadow:catForm.color===p?"0 0 0 1px #fff":"none" }} onClick={()=>setCatForm(f=>({...f,color:p}))} />))}</div></div>
            <div style={{ display:"flex", gap:10, marginTop:6 }}><button className="submit-btn" onClick={saveCat} style={{ flex:1 }}>{editCat==="new"?"Add Category":"Save Changes"}</button>{editCat!=="new" && <button className="danger-btn" onClick={()=>deleteCat(editCat)}>Delete</button>}</div>
          </div>
        </Modal>
      )}

      {/* Edit Long Term Modal */}
      {editLT!==null && (
        <Modal onClose={()=>setEditLT(null)}>
          <div style={{ fontSize:17, fontWeight:700, marginBottom:4 }}>{editLT==="new"?"New Account":"Edit Account"}</div>
          <div style={{ fontSize:12, color:"#475569", marginBottom:22 }}>{editLT==="new"?"Add a savings or investment account.":"Update or delete this account."}</div>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div><div style={{ fontSize:11, color:"#64748b", fontFamily:"'DM Mono',monospace", textTransform:"uppercase", letterSpacing:1.5, marginBottom:7 }}>Name</div><input className="input-field" type="text" placeholder="e.g. Emergency Fund" value={ltForm.name} onChange={e=>setLtForm(f=>({...f,name:e.target.value}))} /></div>
            <div><div style={{ fontSize:11, color:"#64748b", fontFamily:"'DM Mono',monospace", textTransform:"uppercase", letterSpacing:1.5, marginBottom:7 }}>Saved</div><div style={{ position:"relative" }}><span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"#475569" }}>$</span><input className="input-field" type="number" min="0" step="0.01" placeholder="0" value={ltForm.saved} onChange={e=>setLtForm(f=>({...f,saved:e.target.value}))} style={{ paddingLeft:28 }} /></div></div>
            <div><div style={{ fontSize:11, color:"#64748b", fontFamily:"'DM Mono',monospace", textTransform:"uppercase", letterSpacing:1.5, marginBottom:7 }}>Goal</div><div style={{ position:"relative" }}><span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"#475569" }}>$</span><input className="input-field" type="number" min="0" step="0.01" placeholder="0" value={ltForm.goal} onChange={e=>setLtForm(f=>({...f,goal:e.target.value}))} style={{ paddingLeft:28 }} /></div></div>
            <div style={{ display:"flex", gap:12 }}>
              <div style={{ flex:1 }}><div style={{ fontSize:11, color:"#64748b", fontFamily:"'DM Mono',monospace", textTransform:"uppercase", letterSpacing:1.5, marginBottom:7 }}>Start Date <span style={{ color:"#334155", textTransform:"none", letterSpacing:0 }}>(optional)</span></div><input className="input-field" type="month" value={ltForm.startDate} onChange={e=>setLtForm(f=>({...f,startDate:e.target.value}))} style={{ colorScheme:"dark" }} /></div>
              <div style={{ flex:1 }}><div style={{ fontSize:11, color:"#64748b", fontFamily:"'DM Mono',monospace", textTransform:"uppercase", letterSpacing:1.5, marginBottom:7 }}>Target Date <span style={{ color:"#334155", textTransform:"none", letterSpacing:0 }}>(optional)</span></div><input className="input-field" type="month" value={ltForm.targetDate} onChange={e=>setLtForm(f=>({...f,targetDate:e.target.value}))} style={{ colorScheme:"dark" }} /></div>
            </div>
            <div><div style={{ fontSize:11, color:"#64748b", fontFamily:"'DM Mono',monospace", textTransform:"uppercase", letterSpacing:1.5, marginBottom:10 }}>Color</div><div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>{PALETTE.map(p=>(<div key={p} className="color-swatch" style={{ background:p, borderColor:ltForm.color===p?"#fff":"transparent", boxShadow:ltForm.color===p?"0 0 0 1px #fff":"none" }} onClick={()=>setLtForm(f=>({...f,color:p}))} />))}</div></div>
            <div style={{ display:"flex", gap:10, marginTop:6 }}>
              <button className="submit-btn" onClick={saveLT} disabled={syncing} style={{ flex:1 }}>{editLT==="new"?"Add Account":"Save Changes"}</button>
              {editLT!=="new" && <button className="danger-btn" onClick={()=>deleteLT(editLT)} disabled={syncing}>Delete</button>}
            </div>
          </div>
        </Modal>
      )}

      <div style={{ maxWidth:mw, margin:"0 auto", padding:"20px 16px" }}>
        {loading ? <Spinner /> : error ? (
          <div style={{ background:"#450a0a", border:"1px solid #7f1d1d", borderRadius:16, padding:32, textAlign:"center" }}>
            <div style={{ fontSize:16, color:"#f87171", fontWeight:600, marginBottom:8 }}>Connection Error</div>
            <div style={{ fontSize:13, color:"#fca5a5", marginBottom:20 }}>{error}</div>
            <button onClick={loadData} style={{ background:"#1d4ed8", border:"none", borderRadius:10, color:"#fff", padding:"10px 24px", cursor:"pointer", fontFamily:"'Sora',sans-serif", fontWeight:600 }}>Retry</button>
          </div>
        ) : (
          <>
            {/* DASHBOARD */}
            {view==="dashboard" && (
              <div className="fade-in">
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                  <button className="month-btn" onClick={prevMonth}>← {MONTH_NAMES[viewMonth===0?11:viewMonth-1].slice(0,3)}</button>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:15, fontWeight:700, color:"#f1f5f9" }}>{MONTH_NAMES[viewMonth]} {viewYear}</div>
                    {!isCurrentMonth && <div style={{ fontSize:11, color:"#475569", fontFamily:"'DM Mono',monospace" }}>past month</div>}
                  </div>
                  <button className="month-btn" onClick={nextMonth} disabled={isCurrentMonth}>{isCurrentMonth?"—":`${MONTH_NAMES[viewMonth===11?0:viewMonth+1].slice(0,3)} →`}</button>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:24 }}>
                  <StatCard label="Total Spend" value={fmt(totalSpend)} sub={`of ${fmt(totalBudget)} budget`} accent="#3b82f6" flag={totalSpend>totalBudget+2} />
                  <StatCard label="Remaining" value={fmt(Math.max(totalBudget-totalSpend,0))} sub={isCurrentMonth?`${Math.round((dayOfMonth/daysInMonth)*100)}% through month`:"end of month"} accent="#4ade80" flag={totalSpend>totalBudget+2} />
                  <StatCard label="Alerts" value={alertCount} sub={`${overCount} over limit`} accent="#f97316" flag={overCount>0} />
                </div>
                {isDesktop ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
                    <div style={{ background:"#0f172a", borderRadius:16, padding:20, border:"1px solid #1e293b" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                        <div style={{ fontSize:11, fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:2, fontFamily:"'DM Mono',monospace" }}>Category Budgets</div>
                        {isCurrentMonth && <div style={{ fontSize:11, color:"#334155", fontFamily:"'DM Mono',monospace", display:"flex", alignItems:"center", gap:5 }}><div style={{ width:2, height:10, background:"#475569", borderRadius:1 }} /> today</div>}
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:12 }}>
                        {sortedCategories.map(c=>(
                          <CategoryCard key={c} c={c} status={categoryStatuses[c]} catColors={catColors} byCategory={byCategory} budgets={budgets} dayOfMonth={dayOfMonth} daysInMonth={daysInMonth} isCurrentMonth={isCurrentMonth} />
                        ))}
                      </div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:20, alignItems:"start" }}>
                      <MemberSection /><TableSection /><EntriesSection />
                    </div>
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                    <div style={{ background:"#0f172a", borderRadius:16, padding:20, border:"1px solid #1e293b" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                        <div style={{ fontSize:11, fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:2, fontFamily:"'DM Mono',monospace" }}>Category Budgets</div>
                        {isCurrentMonth && <div style={{ fontSize:11, color:"#334155", fontFamily:"'DM Mono',monospace", display:"flex", alignItems:"center", gap:5 }}><div style={{ width:2, height:10, background:"#475569", borderRadius:1 }} /> today</div>}
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
                        {sortedCategories.map(c=>{
                          const status=categoryStatuses[c]; const iconColor=STATUS_ICON[status].color; const projected=Math.round((byCategory[c]||0)/(dayOfMonth/daysInMonth));
                          return (
                            <div key={c}>
                              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6, gap:8 }}>
                                <div style={{ display:"flex", alignItems:"center", gap:7 }}><div style={{ width:8, height:8, borderRadius:2, background:catColors[c]||"#94a3b8", flexShrink:0 }} /><span style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{c}</span><StatusIcon status={status} /></div>
                                <div><span style={{ fontSize:13, fontWeight:700, color:iconColor, fontFamily:"'DM Mono',monospace" }}>{fmt(byCategory[c]||0)}</span><span style={{ fontSize:12, color:"#334155", fontFamily:"'DM Mono',monospace" }}> / {fmt(budgets[c])}</span></div>
                              </div>
                              <BudgetBar spent={byCategory[c]||0} budget={budgets[c]} dayOfMonth={dayOfMonth} daysInMonth={daysInMonth} />
                              {status!=="ok" && isCurrentMonth && <div style={{ fontSize:11, color:iconColor, marginTop:4, fontFamily:"'DM Mono',monospace", opacity:0.8 }}>{status==="over"?`${fmt((byCategory[c]||0)-budgets[c])} over limit`:`Projected EOM: ${fmt(projected)} · ${fmt(projected-budgets[c])} over`}</div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <MemberSection /><TableSection /><EntriesSection />
                  </div>
                )}
              </div>
            )}

            {/* ADD */}
            {view==="add" && (
              <div className="slide-up" style={{ maxWidth:420, margin:"0 auto" }}>
                <div style={{ background:"#0f172a", borderRadius:20, padding:32, border:"1px solid #1e293b" }}>
                  <div style={{ fontSize:20, fontWeight:700, marginBottom:8 }}>Log a spend</div>
                  <div style={{ fontSize:14, color:"#475569", marginBottom:28 }}>Pick your name, category, and amount.</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
                    <div><div style={{ fontSize:12, color:"#64748b", fontFamily:"'DM Mono',monospace", textTransform:"uppercase", letterSpacing:1.5, marginBottom:8 }}>Who are you?</div><div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>{FAMILY_MEMBERS.map(m=>(<button key={m} className="chip" onClick={()=>setForm(f=>({...f,member:m}))} style={{ background:form.member===m?MEMBER_COLORS[m]+"25":"#0a0f1e", border:`1px solid ${form.member===m?MEMBER_COLORS[m]:"#1e293b"}`, color:form.member===m?MEMBER_COLORS[m]:"#475569" }}>{m}</button>))}</div></div>
                    <div>
                      <div style={{ fontSize:12, color:"#64748b", fontFamily:"'DM Mono',monospace", textTransform:"uppercase", letterSpacing:1.5, marginBottom:8 }}>Category</div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>{categories.map(c=>{ const status=categoryStatuses[c]; const isSelected=form.category===c; return (<button key={c} className="chip" onClick={()=>setForm(f=>({...f,category:c}))} style={{ background:isSelected?catColors[c]+"20":"#0a0f1e", border:`1px solid ${isSelected?catColors[c]:status!=="ok"?STATUS_ICON[status].color+"50":"#1e293b"}`, color:isSelected?catColors[c]:status!=="ok"?STATUS_ICON[status].color:"#475569" }}>{status!=="ok"&&<StatusIcon status={status} />}{c}</button>); })}</div>
                      {form.category && (<div style={{ marginTop:10, padding:"10px 14px", borderRadius:10, background:"#0a0f1e", border:"1px solid #1e293b" }}><div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:6 }}><span style={{ color:"#64748b" }}>{form.category}</span><span style={{ color:STATUS_ICON[categoryStatuses[form.category]].color, fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{fmt(byCategory[form.category]||0)} / {fmt(budgets[form.category])}</span></div><BudgetBar spent={byCategory[form.category]||0} budget={budgets[form.category]} dayOfMonth={dayOfMonth} daysInMonth={daysInMonth} /></div>)}
                    </div>
                    <div><div style={{ fontSize:12, color:"#64748b", fontFamily:"'DM Mono',monospace", textTransform:"uppercase", letterSpacing:1.5, marginBottom:8 }}>Amount</div><div style={{ position:"relative" }}><span style={{ position:"absolute", left:16, top:"50%", transform:"translateY(-50%)", color:"#475569", fontSize:16 }}>$</span><input className="input-field" type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} style={{ paddingLeft:32 }} /></div></div>
                    <button className="submit-btn" onClick={handleAddSubmit} disabled={syncing}>{syncing?"Saving…":"Log Spend"}</button>
                  </div>
                </div>
              </div>
            )}

            {/* BUDGETS */}
            {view==="budgets" && (
              <div className="fade-in" style={{ maxWidth:500, margin:"0 auto" }}>
                <div style={{ background:"#0f172a", borderRadius:20, padding:28, border:"1px solid #1e293b" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}><div style={{ fontSize:20, fontWeight:700 }}>Categories</div><button onClick={openNewCat} style={{ background:"#1e40af", border:"none", borderRadius:9, color:"#fff", fontSize:12, fontWeight:700, padding:"7px 14px", cursor:"pointer", fontFamily:"'Sora',sans-serif" }}>+ New</button></div>
                  <div style={{ fontSize:13, color:"#475569", marginBottom:24 }}>Tap a row to edit or delete.</div>
                  <div style={{ display:"flex", flexDirection:"column" }}>
                    {categories.map(c=>{ const status=categoryStatuses[c]; const iconColor=STATUS_ICON[status].color; return (
                      <div key={c} onClick={()=>openEditCat(c)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 10px", borderBottom:"1px solid #0f172a", gap:8, cursor:"pointer", borderRadius:8, transition:"background 0.15s" }} onMouseEnter={e=>e.currentTarget.style.background="#0f172a88"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}><div style={{ width:12, height:12, borderRadius:3, background:catColors[c]||"#94a3b8", flexShrink:0 }} /><span style={{ fontSize:14, color:"#e2e8f0", fontWeight:600 }}>{c}</span><StatusIcon status={status} /></div>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}><span style={{ fontSize:13, fontWeight:700, color:iconColor, fontFamily:"'DM Mono',monospace" }}>{fmt(byCategory[c]||0)}</span><span style={{ fontSize:12, color:"#334155", fontFamily:"'DM Mono',monospace" }}>/ {fmt(budgets[c])}</span><span style={{ color:"#334155", fontSize:12 }}>›</span></div>
                      </div>
                    ); })}
                  </div>
                  <div style={{ marginTop:20, padding:"14px 16px", background:"#0a0f1e", borderRadius:12, border:"1px solid #1e293b", display:"flex", justifyContent:"space-between" }}><span style={{ fontSize:13, color:"#64748b", fontWeight:600 }}>Total budget</span><span style={{ fontSize:14, fontWeight:700, color:"#f1f5f9", fontFamily:"'DM Mono',monospace" }}>{fmt(totalBudget)} / month</span></div>
                </div>
              </div>
            )}

            {/* LONG TERM */}
            {view==="longterm" && (
              <div className="fade-in">
                {longTerm.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"60px 0", color:"#334155", fontSize:14 }}>No accounts yet. Add your first goal below.</div>
                ) : (
                  <div style={{ display:"grid", gridTemplateColumns:isDesktop?"repeat(3, 1fr)":"1fr", gap:16 }}>
                    {longTerm.map((item, i) => {
                      const pct = item.goal > 0 ? Math.min(item.saved / item.goal, 1) : 0;
                      const color = ltColor(item, i);
                      const remaining = Math.max(item.goal - item.saved, 0);
                      const done = item.saved >= item.goal;

                      // Pacing marker — where you should be today based on start → target date
                      let pacingPct = null;
                      if (item.targetDate && item.targetDate !== '' && item.goal > 0 && !done) {
                        const now2 = new Date();
                        const target = new Date(item.targetDate + '-01');
                        // Use start date if set, otherwise default to today minus 1 month as a rough origin
                        const start = item.startDate && item.startDate !== ''
                          ? new Date(item.startDate + '-01')
                          : new Date(now2.getFullYear(), now2.getMonth() - 1, 1);
                        const totalDuration = target - start;
                        const elapsed = now2 - start;
                        if (totalDuration > 0 && elapsed >= 0) {
                          pacingPct = Math.min(elapsed / totalDuration, 0.98);
                        }
                      }

                      return (
                        <div key={i} className="lt-card" onClick={()=>openEditLT(i)}>
                          {/* Header row */}
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                            <div style={{ fontSize:14, fontWeight:700, color:"#e2e8f0" }}>{item.name}</div>
                            <span style={{ fontSize:11, color:"#334155", fontFamily:"'DM Mono',monospace" }}>tap to edit ›</span>
                          </div>

                          {/* Body: donut left, info right */}
                          <div style={{ display:"flex", alignItems:"center", gap:20 }}>
                            <div style={{ position:"relative", flexShrink:0 }}>
                              <DonutChart saved={item.saved} goal={item.goal} color={color} />
                              <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                                <div style={{ fontSize:14, fontWeight:700, color, fontFamily:"'DM Mono',monospace" }}>{Math.round(pct*100)}%</div>
                              </div>
                            </div>

                            <div style={{ flex:1, minWidth:0 }}>
                              {done ? (
                                <div style={{ background:color+"15", border:`1px solid ${color}40`, borderRadius:10, padding:"10px 14px" }}>
                                  <div style={{ fontSize:15, fontWeight:700, color, marginBottom:4 }}>🎉 Goal reached!</div>
                                  <div style={{ fontSize:12, color:"#94a3b8", lineHeight:1.5 }}>You can now put extra funds towards other goals!</div>
                                </div>
                              ) : (
                                <>
                                  <div style={{ display:"flex", gap:16, marginBottom:10 }}>
                                    <div>
                                      <div style={{ fontSize:10, color:"#64748b", fontFamily:"'DM Mono',monospace", marginBottom:2 }}>SAVED</div>
                                      <div style={{ fontSize:18, fontWeight:700, color, fontFamily:"'DM Mono',monospace" }}>{fmt(item.saved)}</div>
                                    </div>
                                    <div>
                                      <div style={{ fontSize:10, color:"#64748b", fontFamily:"'DM Mono',monospace", marginBottom:2 }}>GOAL</div>
                                      <div style={{ fontSize:18, fontWeight:600, color:"#475569", fontFamily:"'DM Mono',monospace" }}>{fmt(item.goal)}</div>
                                    </div>
                                  </div>
                                  <div style={{ fontSize:11, color:"#475569", fontFamily:"'DM Mono',monospace" }}>
                                    {fmt(remaining)} to go{item.targetDate ? ` · by ${new Date(item.targetDate+'-01').toLocaleDateString('en-US',{month:'short',year:'numeric'})}` : ''}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Progress bar with optional pacing marker */}
                          <div style={{ marginTop:14, background:"#1e293b", borderRadius:999, height:5, position:"relative" }}>
                            <div style={{ width:`${pct*100}%`, height:"100%", background:color, borderRadius:999, transition:"width 0.5s" }} />
                            {pacingPct !== null && (
                              <div style={{ position:"absolute", top:-3, bottom:-3, left:`${pacingPct*100}%`, width:2, background:"rgba(255,255,255,0.6)", borderRadius:1, transform:"translateX(-50%)" }} />
                            )}
                          </div>
                          {pacingPct !== null && (
                            <div style={{ display:"flex", justifyContent:"flex-end", marginTop:4 }}>
                              <span style={{ fontSize:10, color:"#334155", fontFamily:"'DM Mono',monospace" }}>— expected today</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Full-width add new callout */}
                <div style={{ marginTop:20, background:"#0f172a", border:"1px dashed #1e293b", borderRadius:16, padding:"20px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, flexWrap:"wrap" }}>
                  <div style={{ fontSize:14, color:"#475569" }}>Looking to track a new long-term goal?</div>
                  <button onClick={openNewLT} style={{ background:"linear-gradient(135deg,#1d4ed8,#7c3aed)", border:"none", borderRadius:10, color:"#fff", fontSize:13, fontWeight:700, padding:"10px 24px", cursor:"pointer", fontFamily:"'Sora',sans-serif", whiteSpace:"nowrap" }}>Add</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
