import { useState, useEffect, useCallback } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

// ========== FIREBASE CONFIG ==========
const firebaseConfig = {
  apiKey: "AIzaSyDMMDUHTvT9GTG0-Y8JuGMvvWLJPJ4TlNs",
  authDomain: "cookiehq-6cd1b.firebaseapp.com",
  projectId: "cookiehq-6cd1b",
  storageBucket: "cookiehq-6cd1b.firebasestorage.app",
  messagingSenderId: "641543192976",
  appId: "1:641543192976:web:ad2acc22b5a815716b3315"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const DATA_DOC = doc(db, "cookieHQ", "sharedData");

// ========== CONSTANTS ==========
const UNITS_PER_CASE = 12;
const COOKIE_PRICE = {
  "Thin Mints": 6, "Caramel Delights": 6, "Peanut Butter Patties": 6,
  "Adventurefuls": 6, "Lemonades": 6, "Trefoils": 6,
  "Peanut Butter Sandwich": 6, "GF Chocolate Chip": 7, "Explore(mores)": 6,
};
const INITIAL_INVENTORY = [
  { id: 1, name: "Thin Mints", cases: 6, units: 72 },
  { id: 2, name: "Caramel Delights", cases: 5, units: 60 },
  { id: 3, name: "Peanut Butter Patties", cases: 4, units: 48 },
  { id: 4, name: "Adventurefuls", cases: 1, units: 12 },
  { id: 5, name: "Lemonades", cases: 1, units: 12 },
  { id: 6, name: "Trefoils", cases: 1, units: 12 },
  { id: 7, name: "Peanut Butter Sandwich", cases: 1, units: 12 },
  { id: 8, name: "GF Chocolate Chip", cases: 1, units: 12 },
  { id: 9, name: "Explore(mores)", cases: 1, units: 12 },
];
const COOKIE_EMOJI = {
  "Thin Mints": "🍫", "Caramel Delights": "🍬", "Peanut Butter Patties": "🥜",
  "Adventurefuls": "🏕️", "Lemonades": "🍋", "Trefoils": "☘️",
  "Peanut Butter Sandwich": "🥪", "GF Chocolate Chip": "🍪", "Explore(mores)": "🔥",
};
const price = (name) => COOKIE_PRICE[name] || 6;
const fmt = (n) => `$${n.toLocaleString()}`;
const fmtDate = (ts) => new Date(ts).toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const fmtDateShort = (ts) => new Date(ts).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

// ========== COMPONENTS ==========
function Badge({ children, color = "green" }) {
  const colors = {
    green: { bg: "#e6f4ea", text: "#1a7431", border: "#b7dfc3" },
    red: { bg: "#fce8e6", text: "#c5221f", border: "#f5c6c2" },
    amber: { bg: "#fef7e0", text: "#b45309", border: "#fde68a" },
    purple: { bg: "#f3e8ff", text: "#7c3aed", border: "#ddd6fe" },
    blue: { bg: "#e0f2fe", text: "#0369a1", border: "#bae6fd" },
  };
  const c = colors[color];
  return (<span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>{children}</span>);
}

function StockBar({ units, maxUnits }) {
  const pct = maxUnits > 0 ? Math.min((units / maxUnits) * 100, 100) : 0;
  const barColor = pct > 50 ? "#22c55e" : pct > 20 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ width: "100%", height: 8, borderRadius: 4, background: "#e5e7eb", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: barColor, transition: "width 0.5s ease" }} />
    </div>
  );
}

// ========== PDF EXPORT ==========
function generatePDFReport(inventory, events, notes, history) {
  const eventRevenue = (event) => event.transactions ? event.transactions.reduce((sum, tx) => sum + tx.qty * price(tx.cookieName), 0) : 0;
  const totalUnits = inventory.reduce((s, i) => s + i.units, 0);
  const totalCases = inventory.reduce((s, i) => s + i.cases, 0);
  const totalValue = inventory.reduce((s, i) => s + i.units * price(i.name), 0);
  const totalSoldAll = events.reduce((s, e) => s + (e.totalSold || 0), 0);
  const totalRevAll = events.reduce((s, e) => s + eventRevenue(e), 0);
  const now = new Date().toLocaleString();

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cookie HQ Report - ${now}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Nunito', sans-serif; color: #1f2937; padding: 0; background: white; }
  .page { page-break-after: always; padding: 40px; }
  .page:last-child { page-break-after: auto; }
  h1 { font-size: 28px; font-weight: 900; color: #047857; margin-bottom: 4px; }
  h2 { font-size: 20px; font-weight: 800; color: #065f46; margin: 24px 0 12px; border-bottom: 2px solid #d1fae5; padding-bottom: 6px; }
  h3 { font-size: 16px; font-weight: 800; color: #374151; margin: 16px 0 8px; }
  .subtitle { font-size: 13px; color: #6b7280; font-weight: 600; margin-bottom: 20px; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
  .summary-card { background: #f0fdf4; border: 1px solid #a7f3d0; border-radius: 10px; padding: 14px; text-align: center; }
  .summary-card .label { font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; }
  .summary-card .value { font-size: 24px; font-weight: 900; color: #047857; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; font-size: 13px; }
  th { background: #065f46; color: white; padding: 8px 10px; text-align: left; font-weight: 700; font-size: 11px; text-transform: uppercase; }
  td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; }
  tr:nth-child(even) { background: #f9fafb; }
  .event-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin: 12px 0; }
  .event-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .event-name { font-size: 16px; font-weight: 800; }
  .event-meta { font-size: 12px; color: #6b7280; }
  .event-stats { display: flex; gap: 20px; margin: 8px 0; }
  .event-stat { font-size: 13px; font-weight: 700; }
  .note-card { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 10px 14px; margin: 8px 0; border-radius: 0 8px 8px 0; }
  .note-date { font-size: 11px; color: #9ca3af; font-weight: 600; }
  .note-text { font-size: 13px; font-weight: 600; margin-top: 4px; white-space: pre-wrap; }
  .log-row { display: flex; align-items: center; gap: 10px; padding: 4px 0; font-size: 12px; border-bottom: 1px solid #f3f4f6; }
  .log-detail { flex: 1; font-weight: 600; }
  .log-time { color: #9ca3af; font-size: 11px; font-weight: 600; }
  .log-badge { padding: 1px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; }
  .badge-sale { background: #fef7e0; color: #b45309; }
  .badge-add { background: #e6f4ea; color: #1a7431; }
  .badge-remove { background: #fce8e6; color: #c5221f; }
  .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
  @media print { .page { padding: 20px; } }
</style></head><body>`;

  // PAGE 1: Summary + Inventory
  html += `<div class="page">
    <h1>🍪 Cookie HQ — Full Report</h1><div class="subtitle">Generated: ${now}</div>
    <h2>Executive Summary</h2>
    <div class="summary-grid">
      <div class="summary-card"><div class="label">Boxes Remaining</div><div class="value">${totalUnits}</div></div>
      <div class="summary-card"><div class="label">Full Cases</div><div class="value">${totalCases}</div></div>
      <div class="summary-card"><div class="label">Inventory Value</div><div class="value">${fmt(totalValue)}</div></div>
      <div class="summary-card"><div class="label">Total Events</div><div class="value">${events.length}</div></div>
    </div>
    <div class="summary-grid">
      <div class="summary-card"><div class="label">Total Boxes Sold</div><div class="value">${totalSoldAll}</div></div>
      <div class="summary-card"><div class="label">Total Revenue</div><div class="value">${fmt(totalRevAll)}</div></div>
      <div class="summary-card"><div class="label">Notes / IOUs</div><div class="value">${notes.length}</div></div>
      <div class="summary-card"><div class="label">Log Entries</div><div class="value">${history.length}</div></div>
    </div>
    <h2>Current Inventory</h2>
    <table><tr><th>Cookie</th><th>Boxes</th><th>Cases</th><th>Loose</th><th>$/Box</th><th>Value</th></tr>
      ${inventory.map(c => `<tr><td><strong>${c.name}</strong></td><td>${c.units}</td><td>${c.cases}</td><td>${c.units % UNITS_PER_CASE}</td><td>${fmt(price(c.name))}</td><td><strong>${fmt(c.units * price(c.name))}</strong></td></tr>`).join("")}
      <tr style="background:#ecfdf5;font-weight:800"><td>TOTAL</td><td>${totalUnits}</td><td>${totalCases}</td><td>${inventory.reduce((s,c) => s + c.units % UNITS_PER_CASE, 0)}</td><td>—</td><td><strong>${fmt(totalValue)}</strong></td></tr>
    </table><div class="footer">Cookie HQ Report • Page 1</div></div>`;

  // PAGE 2: Events
  html += `<div class="page"><h1>🎪 Event Reports</h1><div class="subtitle">All events with sales breakdown</div>`;
  if (events.length === 0) html += `<p style="color:#9ca3af;text-align:center;padding:40px">No events recorded.</p>`;
  events.forEach((event) => {
    const rev = eventRevenue(event);
    const soldEntries = Object.entries(event.sales || {});
    html += `<div class="event-box"><div class="event-header"><div><div class="event-name">${event.name}</div><div class="event-meta">📅 ${event.date}${event.location ? ` · 📍 ${event.location}` : ""}</div></div></div>
      <div class="event-stats"><div class="event-stat">Boxes Sold: <span style="color:#047857">${event.totalSold || 0}</span></div><div class="event-stat">Revenue: <span style="color:#047857">${fmt(rev)}</span></div></div>`;
    if (soldEntries.length > 0) {
      html += `<table><tr><th>Cookie</th><th>Qty Sold</th><th>Revenue</th></tr>`;
      soldEntries.forEach(([cid, qty]) => { const c = inventory.find(i => i.id === Number(cid)); html += `<tr><td>${c?.name || "Unknown"}</td><td>${qty}</td><td>${fmt(qty * price(c?.name))}</td></tr>`; });
      html += `<tr style="background:#ecfdf5;font-weight:800"><td>TOTAL</td><td>${event.totalSold || 0}</td><td>${fmt(rev)}</td></tr></table>`;
    }
    if (event.transactions && event.transactions.length > 0) {
      html += `<h3>Transaction Log</h3>`;
      event.transactions.forEach(tx => { html += `<div class="log-row"><div class="log-detail">${tx.cookieName} × ${tx.qty} = ${fmt(tx.qty * price(tx.cookieName))}</div><div class="log-time">${fmtDate(tx.timestamp)}</div></div>`; });
    }
    html += `</div>`;
  });
  html += `<div class="footer">Cookie HQ Report • Events</div></div>`;

  // PAGE 3: Notes
  html += `<div class="page"><h1>📝 Notes & IOUs</h1><div class="subtitle">All recorded notes</div>`;
  if (notes.length === 0) html += `<p style="color:#9ca3af;text-align:center;padding:40px">No notes recorded.</p>`;
  notes.forEach(note => { html += `<div class="note-card"><div class="note-date">📅 ${fmtDate(note.timestamp)}</div><div class="note-text">${note.text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div></div>`; });
  html += `<div class="footer">Cookie HQ Report • Notes</div></div>`;

  // PAGE 4: Audit Log
  html += `<div class="page"><h1>📋 Full Audit Log</h1><div class="subtitle">Complete changelog</div>`;
  if (history.length === 0) html += `<p style="color:#9ca3af;text-align:center;padding:40px">No activity recorded.</p>`;
  else {
    html += `<table><tr><th>#</th><th>Action</th><th>Cookie</th><th>Qty</th><th>Event</th><th>Timestamp</th></tr>`;
    history.forEach((h, i) => {
      const action = h.type === "sale" ? "SOLD" : h.type === "restock" ? "ADDED" : h.type === "undo" ? "UNDO" : "REMOVED";
      const cls = h.type === "sale" ? "badge-sale" : h.type === "restock" || h.type === "undo" ? "badge-add" : "badge-remove";
      html += `<tr><td>${history.length - i}</td><td><span class="log-badge ${cls}">${action}</span></td><td>${h.cookieName}</td><td>${h.type === "sale" || h.type === "remove" ? "-" : "+"}${h.qty}</td><td>${h.eventName || "—"}</td><td>${fmtDate(h.timestamp)}</td></tr>`;
    });
    html += `</table>`;
  }
  html += `<div class="footer">Cookie HQ Report • Audit Log</div></div></body></html>`;
  return html;
}

// ========== MAIN APP ==========
export default function CookieInventoryApp() {
  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState("inventory");
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEventName, setNewEventName] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventLocation, setNewEventLocation] = useState("");
  const [activeEventId, setActiveEventId] = useState(null);
  const [sellQty, setSellQty] = useState({});
  const [showAdjust, setShowAdjust] = useState(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustType, setAdjustType] = useState("add");
  const [toast, setToast] = useState(null);
  const [history, setHistory] = useState([]);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetStep, setResetStep] = useState(0);
  const [resetNote, setResetNote] = useState("");
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [exporting, setExporting] = useState(false);

  // ===== FIREBASE: LOAD =====
  useEffect(() => {
    const loadData = async () => {
      try {
        const snap = await getDoc(DATA_DOC);
        if (snap.exists()) {
          const data = snap.data();
          if (data.inventory) setInventory(data.inventory);
          if (data.events) setEvents(data.events);
          if (data.history) setHistory(data.history);
          if (data.notes) setNotes(data.notes);
        }
      } catch (e) {
        console.error("Firebase load error:", e);
      }
      setLoaded(true);
    };
    loadData();
  }, []);

  // ===== FIREBASE: SAVE (debounced) =====
  const saveTimeoutRef = useState(null);
  useEffect(() => {
    if (!loaded) return;
    if (saveTimeoutRef[0]) clearTimeout(saveTimeoutRef[0]);
    saveTimeoutRef[0] = setTimeout(async () => {
      setSaving(true);
      try {
        await setDoc(DATA_DOC, { inventory, events, history, notes, lastUpdated: new Date().toISOString() });
      } catch (e) {
        console.error("Firebase save error:", e);
        showToast("Save failed — check connection", "error");
      }
      setSaving(false);
    }, 500);
    return () => { if (saveTimeoutRef[0]) clearTimeout(saveTimeoutRef[0]); };
  }, [inventory, events, history, notes, loaded]);

  // Triple-validated reset
  const executeReset = async () => {
    if (!resetNote.trim() || resetConfirmText !== "RESET ALL DATA") return;
    const resetEntry = { id: Date.now(), type: "remove", cookieId: 0, cookieName: "ALL DATA RESET", qty: 0, eventName: `Reason: ${resetNote.trim()}`, timestamp: new Date().toISOString() };
    const newData = { inventory: INITIAL_INVENTORY, events: [], history: [resetEntry], notes: [], lastUpdated: new Date().toISOString() };
    setInventory(INITIAL_INVENTORY); setEvents([]); setHistory([resetEntry]); setNotes([]);
    setResetStep(0); setResetNote(""); setResetConfirmText("");
    try { await setDoc(DATA_DOC, newData); } catch (e) { console.error("Reset save error:", e); }
    showToast("All data has been reset.");
  };

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const totalUnits = inventory.reduce((s, i) => s + i.units, 0);
  const totalCases = inventory.reduce((s, i) => s + i.cases, 0);
  const totalValue = inventory.reduce((s, i) => s + i.units * price(i.name), 0);

  const addEvent = () => {
    if (!newEventName.trim()) return;
    const ev = { id: Date.now(), name: newEventName.trim(), date: newEventDate || new Date().toISOString().split("T")[0], location: newEventLocation.trim(), sales: {}, transactions: [], totalSold: 0, createdAt: new Date().toISOString() };
    setEvents((prev) => [ev, ...prev]);
    setNewEventName(""); setNewEventDate(""); setNewEventLocation("");
    setShowAddEvent(false); setActiveEventId(ev.id); setActiveTab("events");
    showToast(`Event "${ev.name}" created!`);
  };

  const sellCookies = (eventId, cookieId, qty) => {
    if (qty <= 0) return;
    const cookie = inventory.find((c) => c.id === cookieId);
    if (!cookie || cookie.units < qty) { showToast(`Not enough ${cookie?.name || "cookies"} in stock!`, "error"); return; }
    setInventory((prev) => prev.map((c) => { if (c.id !== cookieId) return c; const u = c.units - qty; return { ...c, units: u, cases: Math.floor(u / UNITS_PER_CASE) }; }));
    setEvents((prev) => prev.map((e) => { if (e.id !== eventId) return e; const pq = e.sales[cookieId] || 0; const txId = Date.now() + Math.random(); return { ...e, sales: { ...e.sales, [cookieId]: pq + qty }, transactions: [...e.transactions, { txId, cookieId, cookieName: cookie.name, qty, timestamp: new Date().toISOString() }], totalSold: e.totalSold + qty }; }));
    setHistory((prev) => [{ id: Date.now(), type: "sale", cookieId, cookieName: cookie.name, qty, eventId, eventName: events.find((e) => e.id === eventId)?.name, timestamp: new Date().toISOString() }, ...prev]);
    setSellQty((prev) => ({ ...prev, [`${eventId}-${cookieId}`]: "" }));
    showToast(`Sold ${qty} ${cookie.name}!`);
  };

  const undoSale = (eventId, txId) => {
    const event = events.find((e) => e.id === eventId); if (!event) return;
    const tx = event.transactions.find((t) => t.txId === txId); if (!tx) return;
    setInventory((prev) => prev.map((c) => { if (c.id !== tx.cookieId) return c; const u = c.units + tx.qty; return { ...c, units: u, cases: Math.floor(u / UNITS_PER_CASE) }; }));
    setEvents((prev) => prev.map((e) => { if (e.id !== eventId) return e; const nq = (e.sales[tx.cookieId] || 0) - tx.qty; const ns = { ...e.sales }; if (nq <= 0) delete ns[tx.cookieId]; else ns[tx.cookieId] = nq; return { ...e, sales: ns, transactions: e.transactions.filter((t) => t.txId !== txId), totalSold: e.totalSold - tx.qty }; }));
    setHistory((prev) => [{ id: Date.now(), type: "undo", cookieId: tx.cookieId, cookieName: tx.cookieName, qty: tx.qty, eventId, eventName: event.name, timestamp: new Date().toISOString() }, ...prev]);
    showToast(`Undid sale of ${tx.qty} ${tx.cookieName}`);
  };

  const adjustInventory = (cookieId) => {
    const qty = parseInt(adjustQty); if (!qty || qty <= 0) return;
    const cookie = inventory.find((c) => c.id === cookieId); if (!cookie) return;
    if (adjustType === "remove" && cookie.units < qty) { showToast("Not enough units!", "error"); return; }
    setInventory((prev) => prev.map((c) => { if (c.id !== cookieId) return c; const u = adjustType === "add" ? c.units + qty : c.units - qty; return { ...c, units: Math.max(0, u), cases: Math.floor(Math.max(0, u) / UNITS_PER_CASE) }; }));
    setHistory((prev) => [{ id: Date.now(), type: adjustType === "add" ? "restock" : "remove", cookieId, cookieName: cookie.name, qty, timestamp: new Date().toISOString() }, ...prev]);
    setShowAdjust(null); setAdjustQty("");
    showToast(`${adjustType === "add" ? "Added" : "Removed"} ${qty} ${cookie.name}!`);
  };

  const addNote = () => {
    if (!newNote.trim()) return;
    setNotes((prev) => [{ id: Date.now(), text: newNote.trim(), timestamp: new Date().toISOString() }, ...prev]);
    setNewNote(""); showToast("Note added!");
  };
  const deleteNote = (noteId) => { setNotes((prev) => prev.filter((n) => n.id !== noteId)); showToast("Note deleted"); };

  const eventRevenue = (event) => event.transactions ? event.transactions.reduce((sum, tx) => sum + tx.qty * price(tx.cookieName), 0) : 0;
  const eventCookieRevenue = (event, cookieId) => { const n = inventory.find((c) => c.id === cookieId)?.name; return (event.sales[cookieId] || 0) * price(n); };

  const exportReport = () => {
    setExporting(true);
    try {
      const html = generatePDFReport(inventory, events, notes, history);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `CookieHQ-Report-${new Date().toISOString().split("T")[0]}.html`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Report downloaded! Open & Print → Save as PDF");
    } catch (e) { showToast("Export failed", "error"); }
    setExporting(false);
  };

  const fonts = `'Nunito', sans-serif`;

  return (
    <div style={{ fontFamily: fonts, minHeight: "100vh", background: "linear-gradient(135deg, #fef9f0 0%, #f0fdf4 50%, #fefce8 100%)", color: "#1f2937", position: "relative" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Fredoka+One&display=swap" rel="stylesheet" />

      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 999, padding: "12px 20px", borderRadius: 12, background: toast.type === "error" ? "#fecaca" : "#bbf7d0", color: toast.type === "error" ? "#991b1b" : "#14532d", fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", animation: "slideIn 0.3s ease", fontSize: 14 }}>
          {toast.type === "error" ? "⚠️" : "✅"} {toast.msg}
        </div>
      )}

      {/* Saving indicator */}
      {saving && (
        <div style={{ position: "fixed", top: 20, left: 20, zIndex: 999, padding: "6px 14px", borderRadius: 8, background: "#e0f2fe", color: "#0369a1", fontWeight: 700, fontSize: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
          ☁️ Saving...
        </div>
      )}

      {/* TRIPLE RESET MODAL */}
      {resetStep > 0 && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 998, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "white", borderRadius: 16, padding: 24, maxWidth: 380, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            {resetStep === 1 && (<>
              <div style={{ fontSize: 40, textAlign: "center", marginBottom: 12 }}>⚠️</div>
              <h3 style={{ margin: "0 0 8px", textAlign: "center", fontWeight: 900, fontSize: 18, color: "#dc2626" }}>Step 1 of 3: Are you sure?</h3>
              <p style={{ color: "#6b7280", fontSize: 14, textAlign: "center", margin: "0 0 20px", lineHeight: 1.5 }}>This will permanently erase <strong>ALL</strong> events, sales data, notes, and inventory changes for <strong>ALL users</strong>. This <strong>cannot be undone</strong>.</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setResetStep(0)} style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid #d1d5db", background: "white", fontFamily: fonts, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Cancel</button>
                <button onClick={() => setResetStep(2)} style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", background: "#dc2626", color: "white", fontFamily: fonts, fontWeight: 800, fontSize: 14, cursor: "pointer" }}>Yes, Continue →</button>
              </div>
            </>)}
            {resetStep === 2 && (<>
              <div style={{ fontSize: 40, textAlign: "center", marginBottom: 12 }}>🛑</div>
              <h3 style={{ margin: "0 0 8px", textAlign: "center", fontWeight: 900, fontSize: 18, color: "#dc2626" }}>Step 2 of 3: Type Confirmation</h3>
              <p style={{ color: "#6b7280", fontSize: 13, textAlign: "center", margin: "0 0 12px" }}>Type <strong>RESET ALL DATA</strong> exactly to proceed:</p>
              <input type="text" value={resetConfirmText} onChange={(e) => setResetConfirmText(e.target.value)} placeholder="Type RESET ALL DATA"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: resetConfirmText === "RESET ALL DATA" ? "2px solid #dc2626" : "1px solid #d1d5db", fontFamily: fonts, fontSize: 14, fontWeight: 700, textAlign: "center", marginBottom: 12, boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setResetStep(0); setResetConfirmText(""); }} style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid #d1d5db", background: "white", fontFamily: fonts, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Cancel</button>
                <button onClick={() => { if (resetConfirmText === "RESET ALL DATA") setResetStep(3); }} disabled={resetConfirmText !== "RESET ALL DATA"}
                  style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", background: resetConfirmText === "RESET ALL DATA" ? "#dc2626" : "#d1d5db", color: "white", fontFamily: fonts, fontWeight: 800, fontSize: 14, cursor: resetConfirmText === "RESET ALL DATA" ? "pointer" : "not-allowed" }}>Continue →</button>
              </div>
            </>)}
            {resetStep === 3 && (<>
              <div style={{ fontSize: 40, textAlign: "center", marginBottom: 12 }}>📝</div>
              <h3 style={{ margin: "0 0 8px", textAlign: "center", fontWeight: 900, fontSize: 18, color: "#dc2626" }}>Step 3 of 3: Required Note</h3>
              <p style={{ color: "#6b7280", fontSize: 13, textAlign: "center", margin: "0 0 12px" }}>Explain why. This will be logged for audit.</p>
              <textarea value={resetNote} onChange={(e) => setResetNote(e.target.value)} placeholder="e.g., End of cookie season..." rows={3}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontFamily: fonts, fontSize: 14, fontWeight: 600, resize: "vertical", boxSizing: "border-box", marginBottom: 12 }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setResetStep(0); setResetNote(""); setResetConfirmText(""); }} style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid #d1d5db", background: "white", fontFamily: fonts, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Cancel</button>
                <button onClick={executeReset} disabled={!resetNote.trim()}
                  style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", background: resetNote.trim() ? "#dc2626" : "#d1d5db", color: "white", fontFamily: fonts, fontWeight: 800, fontSize: 14, cursor: resetNote.trim() ? "pointer" : "not-allowed" }}>🗑️ Reset Everything</button>
              </div>
            </>)}
          </div>
        </div>
      )}

      {/* Loading */}
      {!loaded && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "linear-gradient(135deg, #fef9f0 0%, #f0fdf4 50%, #fefce8 100%)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 56, animation: "spin 1s linear infinite" }}>🍪</div>
          <div style={{ fontFamily: fonts, fontWeight: 800, fontSize: 18, color: "#047857" }}>Loading Cookie HQ...</div>
          <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Connecting to database...</div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #065f46 0%, #047857 40%, #059669 100%)", padding: "24px 20px 20px", color: "white", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -20, fontSize: 120, opacity: 0.08, transform: "rotate(15deg)" }}>🍪</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 26, margin: 0, letterSpacing: 0.5 }}>🍪 Cookie HQ</h1>
            <p style={{ margin: "4px 0 0", opacity: 0.85, fontSize: 14, fontWeight: 600 }}>Girl Scout Cookie Inventory Tracker</p>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={exportReport} disabled={exporting}
              style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "6px 10px", color: "white", fontFamily: fonts, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
              {exporting ? "..." : "📄 Export"}
            </button>
            <button onClick={() => setResetStep(1)}
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "6px 10px", color: "rgba(255,255,255,0.7)", fontFamily: fonts, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
              ⟲ Reset
            </button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {[
            { label: "TOTAL BOXES", value: totalUnits },
            { label: "FULL CASES", value: totalCases },
            { label: "INVENTORY $", value: fmt(totalValue) },
          ].map((card) => (
            <div key={card.label} style={{ flex: 1, background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)", borderRadius: 12, padding: "12px 10px", border: "1px solid rgba(255,255,255,0.2)" }}>
              <div style={{ fontSize: 10, opacity: 0.8, fontWeight: 600 }}>{card.label}</div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>{card.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: "white", borderBottom: "2px solid #e5e7eb", position: "sticky", top: 0, zIndex: 50 }}>
        {[{ id: "inventory", label: "📦 Inventory" }, { id: "events", label: "🎪 Events" }, { id: "notes", label: "📝 Notes" }, { id: "history", label: "📋 Log" }].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: "14px 4px", border: "none", background: "transparent", fontFamily: fonts,
            fontWeight: activeTab === tab.id ? 800 : 600, fontSize: 13, cursor: "pointer",
            color: activeTab === tab.id ? "#047857" : "#6b7280",
            borderBottom: activeTab === tab.id ? "3px solid #047857" : "3px solid transparent", transition: "all 0.2s",
          }}>{tab.label}</button>
        ))}
      </div>

      <div style={{ padding: "16px 16px 100px" }}>

        {/* INVENTORY */}
        {activeTab === "inventory" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px" }}>Current Stock</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {inventory.map((cookie) => {
                const initial = INITIAL_INVENTORY.find((i) => i.id === cookie.id);
                const origUnits = initial?.units || 72;
                const p = price(cookie.name); const val = cookie.units * p;
                return (
                  <div key={cookie.id} style={{ background: "white", borderRadius: 14, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f3f4f6" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                        <span style={{ fontSize: 28 }}>{COOKIE_EMOJI[cookie.name] || "🍪"}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{cookie.name}</div>
                          <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                            <Badge color={cookie.units > 0 ? "green" : "red"}>{cookie.units} boxes</Badge>
                            <Badge color="blue">{cookie.cases} cases</Badge>
                            {cookie.units % UNITS_PER_CASE > 0 && <Badge color="amber">+{cookie.units % UNITS_PER_CASE} loose</Badge>}
                          </div>
                          <div style={{ marginTop: 4, display: "flex", gap: 8, fontSize: 12, fontWeight: 700 }}>
                            <span style={{ color: "#6b7280" }}>{fmt(p)}/box</span>
                            <span style={{ color: "#047857" }}>Value: {fmt(val)}</span>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => { setShowAdjust(showAdjust === cookie.id ? null : cookie.id); setAdjustQty(""); setAdjustType("add"); }}
                        style={{ background: showAdjust === cookie.id ? "#f3f4f6" : "#f0fdf4", border: "1px solid #d1d5db", borderRadius: 8, padding: "6px 12px", fontFamily: fonts, fontWeight: 700, fontSize: 12, cursor: "pointer", color: "#374151" }}>± Adjust</button>
                    </div>
                    <div style={{ marginTop: 8 }}><StockBar units={cookie.units} maxUnits={origUnits} /></div>
                    {showAdjust === cookie.id && (
                      <div style={{ marginTop: 12, padding: 12, background: "#f9fafb", borderRadius: 10, border: "1px solid #e5e7eb" }}>
                        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                          <button onClick={() => setAdjustType("add")} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", fontFamily: fonts, fontWeight: 700, fontSize: 13, cursor: "pointer", background: adjustType === "add" ? "#047857" : "#e5e7eb", color: adjustType === "add" ? "white" : "#6b7280" }}>➕ Add</button>
                          <button onClick={() => setAdjustType("remove")} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", fontFamily: fonts, fontWeight: 700, fontSize: 13, cursor: "pointer", background: adjustType === "remove" ? "#dc2626" : "#e5e7eb", color: adjustType === "remove" ? "white" : "#6b7280" }}>➖ Remove</button>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          {[1, 6, 12].map((q) => (
                            <button key={q} onClick={() => setAdjustQty(String(q))} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: adjustQty === String(q) ? "2px solid #047857" : "1px solid #d1d5db", background: adjustQty === String(q) ? "#ecfdf5" : "white", fontFamily: fonts, fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#1f2937" }}>
                              {q} {q === 12 ? "(case)" : q === 6 ? "(½)" : "box"}
                            </button>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                          <input type="number" min="1" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} placeholder="Custom qty" style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontFamily: fonts, fontSize: 14, fontWeight: 600 }} />
                          <button onClick={() => adjustInventory(cookie.id)} disabled={!adjustQty || parseInt(adjustQty) <= 0}
                            style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: !adjustQty || parseInt(adjustQty) <= 0 ? "#d1d5db" : adjustType === "add" ? "#047857" : "#dc2626", color: "white", fontFamily: fonts, fontWeight: 800, fontSize: 14, cursor: !adjustQty ? "not-allowed" : "pointer" }}>
                            {adjustType === "add" ? "Add" : "Remove"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* EVENTS */}
        {activeTab === "events" && (
          <div>
            {!showAddEvent ? (
              <button onClick={() => setShowAddEvent(true)} style={{ width: "100%", padding: 16, borderRadius: 14, border: "2px dashed #a7f3d0", background: "#ecfdf5", fontFamily: fonts, fontWeight: 800, fontSize: 15, cursor: "pointer", color: "#047857", marginBottom: 16 }}>＋ Add New Event</button>
            ) : (
              <div style={{ background: "white", borderRadius: 14, padding: 16, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", border: "1px solid #d1fae5" }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800 }}>🎪 New Event</h3>
                <input type="text" placeholder="Event name" value={newEventName} onChange={(e) => setNewEventName(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontFamily: fonts, fontSize: 14, fontWeight: 600, marginBottom: 8, boxSizing: "border-box" }} />
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input type="date" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontFamily: fonts, fontSize: 14 }} />
                  <input type="text" placeholder="Location" value={newEventLocation} onChange={(e) => setNewEventLocation(e.target.value)} style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontFamily: fonts, fontSize: 14 }} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={addEvent} disabled={!newEventName.trim()} style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", background: newEventName.trim() ? "#047857" : "#d1d5db", color: "white", fontFamily: fonts, fontWeight: 800, fontSize: 14, cursor: newEventName.trim() ? "pointer" : "not-allowed" }}>Create Event</button>
                  <button onClick={() => setShowAddEvent(false)} style={{ padding: "12px 20px", borderRadius: 10, border: "1px solid #d1d5db", background: "white", fontFamily: fonts, fontWeight: 700, fontSize: 14, cursor: "pointer", color: "#6b7280" }}>Cancel</button>
                </div>
              </div>
            )}
            {events.length === 0 && (<div style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontWeight: 600 }}><div style={{ fontSize: 48, marginBottom: 8 }}>🎪</div>No events yet.</div>)}
            {events.map((event) => {
              const isActive = activeEventId === event.id;
              const soldEntries = Object.entries(event.sales || {});
              const revenue = eventRevenue(event);
              return (
                <div key={event.id} style={{ background: "white", borderRadius: 14, marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: isActive ? "2px solid #047857" : "1px solid #f3f4f6", overflow: "hidden" }}>
                  <div onClick={() => setActiveEventId(isActive ? null : event.id)} style={{ padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>{event.name}</div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2, fontWeight: 600 }}>📅 {event.date}{event.location && ` · 📍 ${event.location}`}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <Badge color="purple">{event.totalSold || 0} sold</Badge>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#047857", marginTop: 4 }}>{fmt(revenue)}</div>
                      <div style={{ fontSize: 18, marginTop: 2 }}>{isActive ? "▲" : "▼"}</div>
                    </div>
                  </div>
                  {isActive && (
                    <div style={{ padding: "0 16px 16px", borderTop: "1px solid #f3f4f6" }}>
                      <div style={{ margin: "12px 0", padding: 12, background: "linear-gradient(135deg, #ecfdf5, #f0fdf4)", borderRadius: 10, border: "1px solid #a7f3d0", display: "flex", justifyContent: "space-around", textAlign: "center" }}>
                        <div><div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280" }}>BOXES SOLD</div><div style={{ fontSize: 22, fontWeight: 900 }}>{event.totalSold || 0}</div></div>
                        <div style={{ width: 1, background: "#a7f3d0" }} />
                        <div><div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280" }}>REVENUE</div><div style={{ fontSize: 22, fontWeight: 900, color: "#047857" }}>{fmt(revenue)}</div></div>
                      </div>
                      {soldEntries.length > 0 && (
                        <div style={{ margin: "0 0 12px", padding: 10, background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0" }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#047857", marginBottom: 6 }}>SALES BREAKDOWN:</div>
                          {soldEntries.map(([cid, qty]) => {
                            const c = inventory.find((i) => i.id === Number(cid)); const rev = eventCookieRevenue(event, Number(cid));
                            return (<div key={cid} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "1px solid #d1fae5" }}>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{COOKIE_EMOJI[c?.name] || "🍪"} {c?.name}</span>
                              <div style={{ display: "flex", gap: 8 }}><Badge color="green">{qty} boxes</Badge><Badge color="purple">{fmt(rev)}</Badge></div>
                            </div>);
                          })}
                          <div style={{ borderTop: "1px solid #bbf7d0", paddingTop: 8, marginTop: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>TRANSACTION LOG:</div>
                            {[...(event.transactions || [])].reverse().map((tx) => (
                              <div key={tx.txId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 8px", marginBottom: 4, background: "white", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                  <span style={{ fontSize: 16 }}>{COOKIE_EMOJI[tx.cookieName] || "🍪"}</span>
                                  <span style={{ fontWeight: 700 }}>{tx.cookieName}</span>
                                  <Badge color="amber">×{tx.qty}</Badge>
                                  <Badge color="purple">{fmt(tx.qty * price(tx.cookieName))}</Badge>
                                  <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>{new Date(tx.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); undoSale(event.id, tx.txId); }}
                                  style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #fca5a5", background: "#fef2f2", color: "#dc2626", fontFamily: fonts, fontWeight: 700, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>↩ Undo</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8, marginTop: 4 }}>Record Sales:</div>
                      {inventory.map((cookie) => {
                        const key = `${event.id}-${cookie.id}`; const val = sellQty[key] || "";
                        return (
                          <div key={cookie.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, padding: "6px 0", borderBottom: "1px solid #f9fafb" }}>
                            <span style={{ fontSize: 20, width: 28 }}>{COOKIE_EMOJI[cookie.name]}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cookie.name}</div>
                              <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>{cookie.units} in stock · {fmt(price(cookie.name))}/box</div>
                            </div>
                            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                              {[1, 3, 6].map((q) => (
                                <button key={q} onClick={() => sellCookies(event.id, cookie.id, q)} disabled={cookie.units < q}
                                  style={{ width: 36, height: 36, borderRadius: 8, border: "none", background: cookie.units < q ? "#f3f4f6" : "#047857", color: cookie.units < q ? "#d1d5db" : "white", fontFamily: fonts, fontWeight: 800, fontSize: 13, cursor: cookie.units < q ? "not-allowed" : "pointer" }}>-{q}</button>
                              ))}
                              <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                                <input type="number" min="1" value={val} onChange={(e) => setSellQty((p) => ({ ...p, [key]: e.target.value }))} placeholder="#"
                                  style={{ width: 42, height: 36, borderRadius: "8px 0 0 8px", border: "1px solid #d1d5db", fontFamily: fonts, fontSize: 13, fontWeight: 700, textAlign: "center", padding: 0 }} />
                                <button onClick={() => { const q = parseInt(val); if (q > 0) sellCookies(event.id, cookie.id, q); }} disabled={!val || parseInt(val) <= 0}
                                  style={{ height: 36, padding: "0 10px", borderRadius: "0 8px 8px 0", border: "none", background: !val || parseInt(val) <= 0 ? "#e5e7eb" : "#0369a1", color: "white", fontFamily: fonts, fontWeight: 800, fontSize: 12, cursor: !val ? "not-allowed" : "pointer" }}>Sell</button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* NOTES */}
        {activeTab === "notes" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px" }}>📝 Notes & IOUs</h2>
            <div style={{ background: "white", borderRadius: 14, padding: 14, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f3f4f6" }}>
              <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add a note... (IOUs, discrepancies, reminders)" rows={3}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontFamily: fonts, fontSize: 14, fontWeight: 600, resize: "vertical", boxSizing: "border-box" }} />
              <button onClick={addNote} disabled={!newNote.trim()}
                style={{ marginTop: 8, width: "100%", padding: 12, borderRadius: 10, border: "none", background: newNote.trim() ? "#047857" : "#d1d5db", color: "white", fontFamily: fonts, fontWeight: 800, fontSize: 14, cursor: newNote.trim() ? "pointer" : "not-allowed" }}>+ Add Note</button>
            </div>
            {notes.length === 0 && (<div style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontWeight: 600 }}><div style={{ fontSize: 48, marginBottom: 8 }}>📝</div>No notes yet.</div>)}
            {notes.map((note) => (
              <div key={note.id} style={{ background: "white", borderRadius: 12, padding: "12px 14px", marginBottom: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", border: "1px solid #fef3c7", borderLeft: "4px solid #f59e0b" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600, marginBottom: 4 }}>📅 {fmtDate(note.timestamp)}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{note.text}</div>
                  </div>
                  <button onClick={() => deleteNote(note.id)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #fca5a5", background: "#fef2f2", color: "#dc2626", fontFamily: fonts, fontWeight: 700, fontSize: 11, cursor: "pointer", marginLeft: 8 }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* HISTORY */}
        {activeTab === "history" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px" }}>Activity Log</h2>
            {history.length === 0 && (<div style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontWeight: 600 }}><div style={{ fontSize: 48, marginBottom: 8 }}>📋</div>No activity yet.</div>)}
            {history.map((h) => (
              <div key={h.id} style={{ background: "white", borderRadius: 12, padding: "12px 14px", marginBottom: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: 12, border: "1px solid #f3f4f6" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: h.type === "sale" ? "#fef3c7" : h.type === "restock" ? "#d1fae5" : h.type === "undo" ? "#e0e7ff" : "#fee2e2" }}>
                  {h.type === "sale" ? "💰" : h.type === "restock" ? "📦" : h.type === "undo" ? "↩️" : "📤"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {h.type === "sale" ? `Sold ${h.qty} ${h.cookieName}` : h.type === "restock" ? `Added ${h.qty} ${h.cookieName}` : h.type === "undo" ? `Undid sale of ${h.qty} ${h.cookieName}` : `Removed ${h.qty} ${h.cookieName}`}
                  </div>
                  <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>{h.eventName && `at ${h.eventName} · `}{fmtDateShort(h.timestamp)}</div>
                </div>
                <Badge color={h.type === "sale" ? "amber" : h.type === "restock" || h.type === "undo" ? "green" : "red"}>
                  {h.type === "sale" || h.type === "remove" ? `-${h.qty}` : `+${h.qty}`}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input:focus, textarea:focus { outline: 2px solid #047857; outline-offset: -1px; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
