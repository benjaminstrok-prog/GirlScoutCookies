import { useState, useEffect, useCallback } from "react";

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

const UNITS_PER_CASE = 12;

const COOKIE_EMOJI = {
  "Thin Mints": "🍫",
  "Caramel Delights": "🍬",
  "Peanut Butter Patties": "🥜",
  "Adventurefuls": "🏕️",
  "Lemonades": "🍋",
  "Trefoils": "☘️",
  "Peanut Butter Sandwich": "🥪",
  "GF Chocolate Chip": "🍪",
  "Explore(mores)": "🔥",
};

// localStorage helpers
function loadSaved(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function Badge({ children, color = "green" }) {
  const colors = {
    green: { bg: "#e6f4ea", text: "#1a7431", border: "#b7dfc3" },
    red: { bg: "#fce8e6", text: "#c5221f", border: "#f5c6c2" },
    amber: { bg: "#fef7e0", text: "#b45309", border: "#fde68a" },
    purple: { bg: "#f3e8ff", text: "#7c3aed", border: "#ddd6fe" },
    blue: { bg: "#e0f2fe", text: "#0369a1", border: "#bae6fd" },
  };
  const c = colors[color];
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 20,
      fontSize: 12, fontWeight: 600, background: c.bg, color: c.text,
      border: `1px solid ${c.border}`,
    }}>{children}</span>
  );
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

export default function App() {
  const [inventory, setInventory] = useState(() => loadSaved("cookiehq_inventory", INITIAL_INVENTORY));
  const [events, setEvents] = useState(() => loadSaved("cookiehq_events", []));
  const [history, setHistory] = useState(() => loadSaved("cookiehq_history", []));
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
  const [showReset, setShowReset] = useState(false);

  // Auto-save on every change
  useEffect(() => { save("cookiehq_inventory", inventory); }, [inventory]);
  useEffect(() => { save("cookiehq_events", events); }, [events]);
  useEffect(() => { save("cookiehq_history", history); }, [history]);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const totalUnits = inventory.reduce((s, i) => s + i.units, 0);
  const totalCases = inventory.reduce((s, i) => s + i.cases, 0);

  const resetAllData = () => {
    setInventory(INITIAL_INVENTORY);
    setEvents([]);
    setHistory([]);
    setShowReset(false);
    localStorage.removeItem("cookiehq_inventory");
    localStorage.removeItem("cookiehq_events");
    localStorage.removeItem("cookiehq_history");
    showToast("All data reset to defaults!");
  };

  const addEvent = () => {
    if (!newEventName.trim()) return;
    const ev = {
      id: Date.now(), name: newEventName.trim(),
      date: newEventDate || new Date().toISOString().split("T")[0],
      location: newEventLocation.trim(), sales: {}, transactions: [],
      totalSold: 0, createdAt: new Date().toISOString(),
    };
    setEvents((prev) => [ev, ...prev]);
    setNewEventName(""); setNewEventDate(""); setNewEventLocation("");
    setShowAddEvent(false); setActiveEventId(ev.id); setActiveTab("events");
    showToast(`Event "${ev.name}" created!`);
  };

  const sellCookies = (eventId, cookieId, qty) => {
    if (qty <= 0) return;
    const cookie = inventory.find((c) => c.id === cookieId);
    if (!cookie || cookie.units < qty) {
      showToast(`Not enough ${cookie?.name || "cookies"} in stock!`, "error");
      return;
    }
    setInventory((prev) => prev.map((c) => {
      if (c.id !== cookieId) return c;
      const newUnits = c.units - qty;
      return { ...c, units: newUnits, cases: Math.floor(newUnits / UNITS_PER_CASE) };
    }));
    setEvents((prev) => prev.map((e) => {
      if (e.id !== eventId) return e;
      const prevQty = e.sales[cookieId] || 0;
      const txId = Date.now() + Math.random();
      return {
        ...e, sales: { ...e.sales, [cookieId]: prevQty + qty },
        transactions: [...e.transactions, { txId, cookieId, cookieName: cookie.name, qty, timestamp: new Date().toISOString() }],
        totalSold: e.totalSold + qty,
      };
    }));
    setHistory((prev) => [{
      id: Date.now(), type: "sale", cookieId, cookieName: cookie.name,
      qty, eventId, eventName: events.find((e) => e.id === eventId)?.name,
      timestamp: new Date().toISOString(),
    }, ...prev]);
    setSellQty((prev) => ({ ...prev, [`${eventId}-${cookieId}`]: "" }));
    showToast(`Sold ${qty} ${cookie.name}!`);
  };

  const undoSale = (eventId, txId) => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return;
    const tx = event.transactions.find((t) => t.txId === txId);
    if (!tx) return;
    setInventory((prev) => prev.map((c) => {
      if (c.id !== tx.cookieId) return c;
      const newUnits = c.units + tx.qty;
      return { ...c, units: newUnits, cases: Math.floor(newUnits / UNITS_PER_CASE) };
    }));
    setEvents((prev) => prev.map((e) => {
      if (e.id !== eventId) return e;
      const newSalesQty = (e.sales[tx.cookieId] || 0) - tx.qty;
      const newSales = { ...e.sales };
      if (newSalesQty <= 0) delete newSales[tx.cookieId];
      else newSales[tx.cookieId] = newSalesQty;
      return { ...e, sales: newSales, transactions: e.transactions.filter((t) => t.txId !== txId), totalSold: e.totalSold - tx.qty };
    }));
    setHistory((prev) => [{
      id: Date.now(), type: "undo", cookieId: tx.cookieId, cookieName: tx.cookieName,
      qty: tx.qty, eventId, eventName: event.name, timestamp: new Date().toISOString(),
    }, ...prev]);
    showToast(`Undid sale of ${tx.qty} ${tx.cookieName}`);
  };

  const adjustInventory = (cookieId) => {
    const qty = parseInt(adjustQty);
    if (!qty || qty <= 0) return;
    const cookie = inventory.find((c) => c.id === cookieId);
    if (!cookie) return;
    if (adjustType === "remove" && cookie.units < qty) {
      showToast("Not enough units to remove!", "error"); return;
    }
    setInventory((prev) => prev.map((c) => {
      if (c.id !== cookieId) return c;
      const newUnits = adjustType === "add" ? c.units + qty : c.units - qty;
      return { ...c, units: Math.max(0, newUnits), cases: Math.floor(Math.max(0, newUnits) / UNITS_PER_CASE) };
    }));
    setHistory((prev) => [{
      id: Date.now(), type: adjustType === "add" ? "restock" : "remove",
      cookieId, cookieName: cookie.name, qty, timestamp: new Date().toISOString(),
    }, ...prev]);
    setShowAdjust(null); setAdjustQty("");
    showToast(`${adjustType === "add" ? "Added" : "Removed"} ${qty} ${cookie.name}!`);
  };

  const fonts = `'Nunito', sans-serif`;

  return (
    <div style={{ fontFamily: fonts, minHeight: "100vh", background: "linear-gradient(135deg, #fef9f0 0%, #f0fdf4 50%, #fefce8 100%)", color: "#1f2937", position: "relative", maxWidth: 480, margin: "0 auto" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 999, padding: "12px 20px",
          borderRadius: 12, background: toast.type === "error" ? "#fecaca" : "#bbf7d0",
          color: toast.type === "error" ? "#991b1b" : "#14532d", fontWeight: 700,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)", animation: "slideIn 0.3s ease", fontSize: 14,
        }}>
          {toast.type === "error" ? "⚠️" : "✅"} {toast.msg}
        </div>
      )}

      {/* Reset modal */}
      {showReset && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 998, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "white", borderRadius: 16, padding: 24, maxWidth: 340, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 36, textAlign: "center", marginBottom: 12 }}>⚠️</div>
            <h3 style={{ margin: "0 0 8px", textAlign: "center", fontWeight: 800 }}>Reset All Data?</h3>
            <p style={{ color: "#6b7280", fontSize: 14, textAlign: "center", margin: "0 0 20px" }}>
              This will erase all events, sales history, and reset inventory to the original amounts. This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowReset(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid #d1d5db", background: "white", fontFamily: fonts, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Cancel</button>
              <button onClick={resetAllData} style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", background: "#dc2626", color: "white", fontFamily: fonts, fontWeight: 800, fontSize: 14, cursor: "pointer" }}>Reset Everything</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #065f46 0%, #047857 40%, #059669 100%)", padding: "24px 20px 20px", color: "white", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -20, fontSize: 120, opacity: 0.08, transform: "rotate(15deg)" }}>🍪</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontFamily: "'Fredoka One', cursive", fontSize: 26, margin: 0, letterSpacing: 0.5 }}>🍪 Cookie HQ</h1>
            <p style={{ margin: "4px 0 0", opacity: 0.85, fontSize: 14, fontWeight: 600 }}>Girl Scout Cookie Inventory</p>
          </div>
          <button onClick={() => setShowReset(true)} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "6px 10px", color: "white", fontFamily: fonts, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>⟲ Reset</button>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          {[
            { label: "TOTAL BOXES", value: totalUnits },
            { label: "FULL CASES", value: totalCases },
            { label: "EVENTS", value: events.length },
          ].map((s) => (
            <div key={s.label} style={{ flex: 1, background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)", borderRadius: 12, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.2)" }}>
              <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 900 }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: "white", borderBottom: "2px solid #e5e7eb", position: "sticky", top: 0, zIndex: 50 }}>
        {[{ id: "inventory", label: "📦 Inventory" }, { id: "events", label: "🎪 Events" }, { id: "history", label: "📋 History" }].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: "14px 8px", border: "none", background: "transparent", fontFamily: fonts,
            fontWeight: activeTab === tab.id ? 800 : 600, fontSize: 14, cursor: "pointer",
            color: activeTab === tab.id ? "#047857" : "#6b7280",
            borderBottom: activeTab === tab.id ? "3px solid #047857" : "3px solid transparent",
          }}>{tab.label}</button>
        ))}
      </div>

      <div style={{ padding: "16px 16px 100px" }}>

        {/* ===== INVENTORY TAB ===== */}
        {activeTab === "inventory" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px" }}>Current Stock</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {inventory.map((cookie) => {
                const initial = INITIAL_INVENTORY.find((i) => i.id === cookie.id);
                const origUnits = initial?.units || 72;
                return (
                  <div key={cookie.id} style={{ background: "white", borderRadius: 14, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f3f4f6" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                        <span style={{ fontSize: 28 }}>{COOKIE_EMOJI[cookie.name] || "🍪"}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{cookie.name}</div>
                          <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                            <Badge color={cookie.units > 0 ? "green" : "red"}>{cookie.units} boxes</Badge>
                            <Badge color="blue">{cookie.cases} cases</Badge>
                            {cookie.units % UNITS_PER_CASE > 0 && <Badge color="amber">+{cookie.units % UNITS_PER_CASE} loose</Badge>}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => { setShowAdjust(showAdjust === cookie.id ? null : cookie.id); setAdjustQty(""); setAdjustType("add"); }}
                        style={{ background: showAdjust === cookie.id ? "#f3f4f6" : "#f0fdf4", border: "1px solid #d1d5db", borderRadius: 8, padding: "6px 12px", fontFamily: fonts, fontWeight: 700, fontSize: 12, cursor: "pointer", color: "#374151" }}>
                        ± Adjust
                      </button>
                    </div>
                    <div style={{ marginTop: 8 }}><StockBar units={cookie.units} maxUnits={origUnits} /></div>

                    {showAdjust === cookie.id && (
                      <div style={{ marginTop: 12, padding: 12, background: "#f9fafb", borderRadius: 10, border: "1px solid #e5e7eb" }}>
                        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                          <button onClick={() => setAdjustType("add")} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", fontFamily: fonts, fontWeight: 700, fontSize: 13, cursor: "pointer", background: adjustType === "add" ? "#047857" : "#e5e7eb", color: adjustType === "add" ? "white" : "#6b7280" }}>➕ Add Stock</button>
                          <button onClick={() => setAdjustType("remove")} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", fontFamily: fonts, fontWeight: 700, fontSize: 13, cursor: "pointer", background: adjustType === "remove" ? "#dc2626" : "#e5e7eb", color: adjustType === "remove" ? "white" : "#6b7280" }}>➖ Remove</button>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          {[1, 6, 12].map((q) => (
                            <button key={q} onClick={() => setAdjustQty(String(q))} style={{
                              flex: 1, padding: "8px 0", borderRadius: 8,
                              border: adjustQty === String(q) ? "2px solid #047857" : "1px solid #d1d5db",
                              background: adjustQty === String(q) ? "#ecfdf5" : "white",
                              fontFamily: fonts, fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#1f2937",
                            }}>{q} {q === 12 ? "(1 case)" : q === 6 ? "(½ case)" : "box"}</button>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                          <input type="number" min="1" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} placeholder="Custom qty"
                            style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontFamily: fonts, fontSize: 14, fontWeight: 600 }} />
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

        {/* ===== EVENTS TAB ===== */}
        {activeTab === "events" && (
          <div>
            {!showAddEvent ? (
              <button onClick={() => setShowAddEvent(true)} style={{ width: "100%", padding: 16, borderRadius: 14, border: "2px dashed #a7f3d0", background: "#ecfdf5", fontFamily: fonts, fontWeight: 800, fontSize: 15, cursor: "pointer", color: "#047857", marginBottom: 16 }}>＋ Add New Event</button>
            ) : (
              <div style={{ background: "white", borderRadius: 14, padding: 16, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", border: "1px solid #d1fae5" }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800 }}>🎪 New Event</h3>
                <input type="text" placeholder="Event name (e.g., Sunday Booth Sale)" value={newEventName} onChange={(e) => setNewEventName(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontFamily: fonts, fontSize: 14, fontWeight: 600, marginBottom: 8, boxSizing: "border-box" }} />
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

            {events.length === 0 && (
              <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontWeight: 600 }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>🎪</div>No events yet. Add one to start selling!
              </div>
            )}

            {events.map((event) => {
              const isActive = activeEventId === event.id;
              const soldEntries = Object.entries(event.sales);
              return (
                <div key={event.id} style={{ background: "white", borderRadius: 14, marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: isActive ? "2px solid #047857" : "1px solid #f3f4f6", overflow: "hidden" }}>
                  <div onClick={() => setActiveEventId(isActive ? null : event.id)} style={{ padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>{event.name}</div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2, fontWeight: 600 }}>
                        📅 {event.date}{event.location && ` · 📍 ${event.location}`}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <Badge color="purple">{event.totalSold} sold</Badge>
                      <div style={{ fontSize: 18, marginTop: 4 }}>{isActive ? "▲" : "▼"}</div>
                    </div>
                  </div>

                  {isActive && (
                    <div style={{ padding: "0 16px 16px", borderTop: "1px solid #f3f4f6" }}>
                      {/* Sales summary + undo */}
                      {soldEntries.length > 0 && (
                        <div style={{ margin: "12px 0", padding: 10, background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0" }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#047857", marginBottom: 6 }}>SOLD AT THIS EVENT:</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                            {soldEntries.map(([cid, qty]) => {
                              const c = inventory.find((i) => i.id === Number(cid));
                              return <Badge key={cid} color="green">{COOKIE_EMOJI[c?.name] || "🍪"} {c?.name}: {qty}</Badge>;
                            })}
                          </div>
                          <div style={{ borderTop: "1px solid #bbf7d0", paddingTop: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>TRANSACTION LOG (tap undo to reverse):</div>
                            {[...event.transactions].reverse().map((tx) => (
                              <div key={tx.txId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 8px", marginBottom: 4, background: "white", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                  <span style={{ fontSize: 16 }}>{COOKIE_EMOJI[tx.cookieName] || "🍪"}</span>
                                  <span style={{ fontWeight: 700 }}>{tx.cookieName}</span>
                                  <Badge color="amber">×{tx.qty}</Badge>
                                  <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>
                                    {new Date(tx.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                                  </span>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); undoSale(event.id, tx.txId); }}
                                  style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #fca5a5", background: "#fef2f2", color: "#dc2626", fontFamily: fonts, fontWeight: 700, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap", marginLeft: 8 }}>
                                  ↩ Undo
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8, marginTop: 12 }}>Record Sales:</div>
                      {inventory.map((cookie) => {
                        const key = `${event.id}-${cookie.id}`;
                        const val = sellQty[key] || "";
                        return (
                          <div key={cookie.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, padding: "6px 0", borderBottom: "1px solid #f9fafb" }}>
                            <span style={{ fontSize: 20, width: 28 }}>{COOKIE_EMOJI[cookie.name]}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cookie.name}</div>
                              <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>{cookie.units} in stock</div>
                            </div>
                            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                              {[1, 3, 6].map((q) => (
                                <button key={q} onClick={() => sellCookies(event.id, cookie.id, q)} disabled={cookie.units < q}
                                  style={{ width: 36, height: 36, borderRadius: 8, border: "none", background: cookie.units < q ? "#f3f4f6" : "#047857", color: cookie.units < q ? "#d1d5db" : "white", fontFamily: fonts, fontWeight: 800, fontSize: 13, cursor: cookie.units < q ? "not-allowed" : "pointer" }}>
                                  -{q}
                                </button>
                              ))}
                              <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                                <input type="number" min="1" value={val} onChange={(e) => setSellQty((p) => ({ ...p, [key]: e.target.value }))} placeholder="#"
                                  style={{ width: 42, height: 36, borderRadius: "8px 0 0 8px", border: "1px solid #d1d5db", fontFamily: fonts, fontSize: 13, fontWeight: 700, textAlign: "center", padding: 0 }} />
                                <button onClick={() => { const q = parseInt(val); if (q > 0) sellCookies(event.id, cookie.id, q); }} disabled={!val || parseInt(val) <= 0}
                                  style={{ height: 36, padding: "0 10px", borderRadius: "0 8px 8px 0", border: "none", background: !val || parseInt(val) <= 0 ? "#e5e7eb" : "#0369a1", color: "white", fontFamily: fonts, fontWeight: 800, fontSize: 12, cursor: !val ? "not-allowed" : "pointer" }}>
                                  Sell
                                </button>
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

        {/* ===== HISTORY TAB ===== */}
        {activeTab === "history" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px" }}>Activity Log</h2>
            {history.length === 0 && (
              <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontWeight: 600 }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>📋</div>No activity yet.
              </div>
            )}
            {history.map((h) => (
              <div key={h.id} style={{ background: "white", borderRadius: 12, padding: "12px 14px", marginBottom: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", gap: 12, border: "1px solid #f3f4f6" }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                  background: h.type === "sale" ? "#fef3c7" : h.type === "restock" ? "#d1fae5" : h.type === "undo" ? "#e0e7ff" : "#fee2e2",
                }}>
                  {h.type === "sale" ? "💰" : h.type === "restock" ? "📦" : h.type === "undo" ? "↩️" : "📤"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {h.type === "sale" ? `Sold ${h.qty} ${h.cookieName}` : h.type === "restock" ? `Added ${h.qty} ${h.cookieName}` : h.type === "undo" ? `Undid sale of ${h.qty} ${h.cookieName}` : `Removed ${h.qty} ${h.cookieName}`}
                  </div>
                  <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>
                    {h.eventName && `at ${h.eventName} · `}
                    {new Date(h.timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </div>
                </div>
                <Badge color={h.type === "sale" ? "amber" : h.type === "restock" ? "green" : h.type === "undo" ? "blue" : "red"}>
                  {h.type === "sale" ? `-${h.qty}` : h.type === "restock" ? `+${h.qty}` : h.type === "undo" ? `+${h.qty}` : `-${h.qty}`}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        input:focus { outline: 2px solid #047857; outline-offset: -1px; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
