import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Config ───────────────────────────────────────────────────────────────────

const API_BASE = "http://localhost:5000";

// ─── API Layer ────────────────────────────────────────────────────────────────

const api = {
  getTasks: () =>
    fetch(`${API_BASE}/tasks`).then((r) => r.json()),

  addTask: (text) =>
    fetch(`${API_BASE}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }).then((r) => r.json()),

  toggleTask: (id, completed) =>
    fetch(`${API_BASE}/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    }).then((r) => r.json()),

  deleteTask: (id) =>
    fetch(`${API_BASE}/tasks/${id}`, { method: "DELETE" }).then((r) => r.json()),

  clearCompleted: () =>
    fetch(`${API_BASE}/tasks`, { method: "DELETE" }).then((r) => r.json()),
};

// ─── Constants ────────────────────────────────────────────────────────────────

const FILTERS = ["All", "Active", "Completed"];

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ size = 14, color = "rgba(255,255,255,0.8)" }) {
  return (
    <motion.svg
      width={size} height={size} viewBox="0 0 14 14" fill="none"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.75, repeat: Infinity, ease: "linear" }}
      style={{ flexShrink: 0 }}
    >
      <circle cx="7" cy="7" r="5.5" stroke={color} strokeWidth="2" strokeOpacity="0.18" />
      <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </motion.svg>
  );
}

// ─── Error Banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ message, onDismiss }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.25 }}
      style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        borderRadius: 16, padding: "12px 14px", marginBottom: 14,
        background: "rgba(239,68,68,0.1)",
        border: "1px solid rgba(239,68,68,0.25)",
        backdropFilter: "blur(12px)",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
        <circle cx="8" cy="8" r="7" stroke="rgba(248,113,113,0.8)" strokeWidth="1.5" />
        <path d="M8 5v3.5M8 10.5v.5" stroke="rgba(248,113,113,0.9)" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span style={{ flex: 1, fontSize: 12, lineHeight: 1.55, color: "rgba(252,165,165,0.9)" }}>{message}</span>
      <button
        onClick={onDismiss}
        style={{ color: "rgba(248,113,113,0.55)", background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1 }}
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </motion.div>
  );
}

// ─── Full-screen Loader ───────────────────────────────────────────────────────

function FullScreenLoader() {
  return (
    <div style={{
      position: "fixed", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 16,
      background: "linear-gradient(135deg,#0a0a0f 0%,#0f0a1a 40%,#0a0f1a 100%)",
    }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
        style={{
          width: 40, height: 40, borderRadius: "50%",
          border: "3px solid rgba(139,92,246,0.12)",
          borderTop: "3px solid #8b5cf6",
        }}
      />
      <p style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(139,92,246,0.55)", margin: 0 }}>
        Connecting to API…
      </p>
    </div>
  );
}

// ─── Particle Background ──────────────────────────────────────────────────────

function ParticleBackground() {
  const pts = useRef(
    [...Array(16)].map((_, i) => ({
      w: Math.random() * 5 + 2,
      l: Math.random() * 100,
      t: Math.random() * 100,
      color: i % 3 === 0 ? "rgba(139,92,246,0.4)" : i % 3 === 1 ? "rgba(59,130,246,0.3)" : "rgba(236,72,153,0.3)",
      dur: Math.random() * 6 + 5,
      delay: Math.random() * 4,
      dx: Math.random() * 20 - 10,
    }))
  );
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {pts.current.map((p, i) => (
        <motion.div key={i} style={{
          position: "absolute", width: p.w, height: p.w,
          left: `${p.l}%`, top: `${p.t}%`,
          borderRadius: "50%", background: p.color,
        }}
          animate={{ y: [0, -26, 0], x: [0, p.dx, 0], opacity: [0.2, 0.55, 0.2] }}
          transition={{ duration: p.dur, repeat: Infinity, ease: "easeInOut", delay: p.delay }}
        />
      ))}
    </div>
  );
}

// ─── Task Item ────────────────────────────────────────────────────────────────

function TaskItem({ task, onToggle, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleToggle = async () => {
    if (toggling || deleting) return;
    setToggling(true);
    await onToggle(task.id, !task.completed);
    setToggling(false);
  };

  const handleDelete = async () => {
    if (toggling || deleting) return;
    setDeleting(true);
    await onDelete(task.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -44, scale: 0.91, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        background: hovered ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)",
        border: hovered ? "1px solid rgba(139,92,246,0.4)" : "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(12px)",
        borderRadius: 16,
        opacity: deleting ? 0.45 : 1,
        transition: "background .25s, border .25s, opacity .2s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>

        {/* Toggle */}
        <motion.button
          whileTap={!toggling ? { scale: 0.82 } : {}}
          onClick={handleToggle}
          disabled={toggling || deleting}
          style={{
            width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
            border: `2px solid ${task.completed ? "#8b5cf6" : "rgba(255,255,255,0.25)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: toggling ? "default" : "pointer",
            background: task.completed ? "linear-gradient(135deg,#8b5cf6,#6366f1)" : "transparent",
            boxShadow: task.completed ? "0 0 12px rgba(139,92,246,0.5)" : "none",
            transition: "all .25s",
          }}
        >
          {toggling ? (
            <Spinner size={12} color="rgba(255,255,255,0.85)" />
          ) : task.completed ? (
            <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
          ) : null}
        </motion.button>

        {/* Text */}
        <span style={{
          flex: 1, fontSize: 14, fontWeight: 500, letterSpacing: "0.01em",
          color: task.completed ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.88)",
          textDecoration: task.completed ? "line-through" : "none",
          transition: "all .25s",
        }}>
          {task.text}
        </span>

        {/* Delete */}
        <motion.button
          animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1 : 0.75 }}
          whileTap={!deleting ? { scale: 0.88 } : {}}
          onClick={handleDelete}
          disabled={toggling || deleting}
          style={{
            width: 28, height: 28, borderRadius: 10, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(239,68,68,0.15)", color: "rgba(248,113,113,0.9)",
            border: "none", cursor: deleting ? "default" : "pointer", transition: "background .2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.28)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.15)"; }}
        >
          {deleting
            ? <Spinner size={12} color="rgba(248,113,113,0.85)" />
            : <svg width="12" height="12" viewBox="0 0 13 13" fill="none">
                <path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
          }
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ filter }) {
  const msgs = {
    All:       { icon: "✦", title: "No tasks yet",     sub: "Add something to get started" },
    Active:    { icon: "◎", title: "Nothing active",   sub: "All tasks are completed" },
    Completed: { icon: "◈", title: "Nothing done yet", sub: "Complete some tasks first" },
  };
  const { icon, title, sub } = msgs[filter] || msgs.All;
  return (
    <motion.div key="empty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "52px 0", gap: 10 }}
    >
      <span style={{ fontSize: 32, color: "rgba(139,92,246,0.45)" }}>{icon}</span>
      <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.4)", margin: 0 }}>{title}</p>
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.22)", margin: 0 }}>{sub}</p>
    </motion.div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [tasks,    setTasks]    = useState([]);
  const [input,    setInput]    = useState("");
  const [filter,   setFilter]   = useState("All");
  const [loading,  setLoading]  = useState(true);
  const [adding,   setAdding]   = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error,    setError]    = useState(null);
  const inputRef = useRef(null);

  const showError  = (msg) => setError(msg);
  const clearError = ()    => setError(null);

  // ── Initial fetch ─────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getTasks();
        if (!res.success) throw new Error(res.error || "Server error");
        setTasks(res.data);
      } catch (e) {
        showError(`Could not reach the API — is your server running at ${API_BASE}? (${e.message})`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Add task (optimistic) ──────────────────────────────────────────────────

  const addTask = useCallback(async () => {
    const text = input.trim();
    if (!text || adding) return;
    clearError();
    setAdding(true);

    const tempId = `temp-${Date.now()}`;
    const optimistic = { id: tempId, text, completed: false, createdAt: new Date().toISOString() };
    setTasks((p) => [optimistic, ...p]);
    setInput("");

    try {
      const res = await api.addTask(text);
      if (!res.success) throw new Error(res.error || "Failed to add task");
      setTasks((p) => p.map((t) => (t.id === tempId ? res.data : t)));
    } catch (e) {
      setTasks((p) => p.filter((t) => t.id !== tempId));
      setInput(text);
      showError(`Add failed: ${e.message}`);
    } finally {
      setAdding(false);
      inputRef.current?.focus();
    }
  }, [input, adding]);

  // ── Toggle task (optimistic) ───────────────────────────────────────────────

  const toggleTask = useCallback(async (id, completed) => {
    clearError();
    setTasks((p) => p.map((t) => (t.id === id ? { ...t, completed } : t)));
    try {
      const res = await api.toggleTask(id, completed);
      if (!res.success) throw new Error(res.error || "Failed to update task");
      setTasks((p) => p.map((t) => (t.id === id ? res.data : t)));
    } catch (e) {
      setTasks((p) => p.map((t) => (t.id === id ? { ...t, completed: !completed } : t)));
      showError(`Update failed: ${e.message}`);
    }
  }, []);

  // ── Delete task (optimistic) ───────────────────────────────────────────────

  const deleteTask = useCallback(async (id) => {
    clearError();
    const snapshot = tasks.find((t) => t.id === id);
    setTasks((p) => p.filter((t) => t.id !== id));
    try {
      const res = await api.deleteTask(id);
      if (!res.success) throw new Error(res.error || "Failed to delete task");
    } catch (e) {
      if (snapshot) setTasks((p) => [...p, snapshot]);
      showError(`Delete failed: ${e.message}`);
    }
  }, [tasks]);

  // ── Clear completed (optimistic) ──────────────────────────────────────────

  const clearCompleted = useCallback(async () => {
    if (clearing) return;
    clearError();
    const snapshot = tasks.filter((t) => t.completed);
    setClearing(true);
    setTasks((p) => p.filter((t) => !t.completed));
    try {
      const res = await api.clearCompleted();
      if (!res.success) throw new Error(res.error || "Failed to clear completed");
    } catch (e) {
      setTasks((p) => [...snapshot, ...p]);
      showError(`Clear failed: ${e.message}`);
    } finally {
      setClearing(false);
    }
  }, [tasks, clearing]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const filteredTasks  = tasks.filter((t) =>
    filter === "All" ? true : filter === "Active" ? !t.completed : t.completed
  );
  const activeCount    = tasks.filter((t) => !t.completed).length;
  const completedCount = tasks.filter((t) => t.completed).length;
  const progress       = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <FullScreenLoader />;

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center",
      padding: "40px 16px 64px",
      background: "linear-gradient(135deg,#0a0a0f 0%,#0f0a1a 40%,#0a0f1a 100%)",
      fontFamily: "'DM Sans','Inter',sans-serif", position: "relative",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box}
        ::placeholder{color:rgba(255,255,255,.22)}
        input{outline:none}
        button{font-family:'DM Sans','Inter',sans-serif}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(139,92,246,.3);border-radius:99px}
      `}</style>

      <ParticleBackground />

      <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
          style={{ marginBottom: 22 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              style={{ width: 14, height: 14, borderRadius: "50%", background: "linear-gradient(135deg,#8b5cf6,#ec4899)", flexShrink: 0 }}
            />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(139,92,246,0.8)" }}>
              Task Manager
            </span>
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 700, color: "rgba(255,255,255,0.95)", letterSpacing: "-0.02em", margin: "0 0 8px" }}>
            My Tasks
          </h1>
          {/* API status pill */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 99, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
              background: error ? "#f87171" : "#34d399",
              boxShadow: error ? "0 0 6px rgba(248,113,113,0.55)" : "0 0 6px rgba(52,211,153,0.55)",
            }} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", whiteSpace: "nowrap" }}>
              {error ? "API unreachable" : `Connected · ${API_BASE}`}
            </span>
          </div>
        </motion.div>

        {/* ── Error Banner ── */}
        <AnimatePresence>
          {error && <ErrorBanner key="err" message={error} onDismiss={clearError} />}
        </AnimatePresence>

        {/* ── Progress ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.38)" }}>{completedCount} of {tasks.length} complete</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(139,92,246,0.9)" }}>{progress}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, overflow: "hidden", background: "rgba(255,255,255,0.07)" }}>
            <motion.div
              animate={{ width: `${progress}%` }} transition={{ duration: 0.55, ease: "easeOut" }}
              style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#8b5cf6,#ec4899)" }}
            />
          </div>
        </motion.div>

        {/* ── Input ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          style={{
            marginBottom: 12, borderRadius: 18, padding: "10px 10px 10px 16px",
            display: "flex", gap: 8,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(20px)",
          }}
        >
          <input
            ref={inputRef} value={input} disabled={adding}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            placeholder="Add a new task…"
            style={{ flex: 1, background: "transparent", border: "none", color: "rgba(255,255,255,0.88)", fontSize: 14, fontFamily: "inherit" }}
          />
          <motion.button
            whileHover={!adding ? { scale: 1.04 } : {}}
            whileTap={!adding ? { scale: 0.93 } : {}}
            onClick={addTask} disabled={adding}
            style={{
              padding: "8px 16px", borderRadius: 12, fontSize: 13, fontWeight: 600, border: "none",
              background: adding ? "rgba(139,92,246,0.4)" : "linear-gradient(135deg,#8b5cf6,#6366f1)",
              color: "white", cursor: adding ? "default" : "pointer",
              boxShadow: adding ? "none" : "0 4px 18px rgba(139,92,246,0.4)",
              display: "flex", alignItems: "center", gap: 6, flexShrink: 0, transition: "background .2s, box-shadow .2s",
            }}
          >
            {adding
              ? <><Spinner size={13} /><span>Adding…</span></>
              : <><svg width="12" height="12" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v11M1 6.5h11" stroke="white" strokeWidth="2" strokeLinecap="round" /></svg><span>Add</span></>
            }
          </motion.button>
        </motion.div>

        {/* ── Filter Tabs ── */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          style={{ display: "flex", gap: 4, marginBottom: 12, padding: 4, borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{
              flex: 1, padding: "8px 4px", fontSize: 12, fontWeight: 600, borderRadius: 10, cursor: "pointer",
              background: filter === f ? "linear-gradient(135deg,rgba(139,92,246,0.35),rgba(99,102,241,0.22))" : "transparent",
              border: filter === f ? "1px solid rgba(139,92,246,0.3)" : "1px solid transparent",
              color: filter === f ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.36)",
              transition: "all .2s",
            }}>
              {f}
              {f === "Active" && activeCount > 0 && (
                <span style={{ marginLeft: 5, padding: "1px 6px", borderRadius: 99, fontSize: 10, background: "rgba(139,92,246,0.3)", color: "rgba(196,181,253,0.9)" }}>
                  {activeCount}
                </span>
              )}
            </button>
          ))}
        </motion.div>

        {/* ── Task List ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          style={{ borderRadius: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(16px)", minHeight: 200, padding: 8 }}
        >
          <AnimatePresence mode="popLayout">
            {filteredTasks.length === 0
              ? <EmptyState filter={filter} key="empty" />
              : <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {filteredTasks.map((task) => (
                    <TaskItem key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
                  ))}
                </div>
            }
          </AnimatePresence>
        </motion.div>

        {/* ── Clear Completed ── */}
        <AnimatePresence>
          {completedCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
              style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}
            >
              <motion.button
                whileHover={!clearing ? { scale: 1.03 } : {}}
                whileTap={!clearing ? { scale: 0.96 } : {}}
                onClick={clearCompleted} disabled={clearing}
                style={{
                  fontSize: 12, padding: "6px 12px", borderRadius: 10,
                  cursor: clearing ? "default" : "pointer",
                  color: "rgba(248,113,113,0.7)", background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.15)", display: "flex", alignItems: "center", gap: 6, transition: "all .2s",
                }}
                onMouseEnter={(e) => { if (!clearing) { e.currentTarget.style.background = "rgba(239,68,68,0.16)"; e.currentTarget.style.color = "rgba(248,113,113,0.95)"; } }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.color = "rgba(248,113,113,0.7)"; }}
              >
                {clearing && <Spinner size={11} color="rgba(248,113,113,0.8)" />}
                {clearing ? "Clearing…" : `Clear ${completedCount} completed`}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
