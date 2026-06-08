/**
 * TODO App — Express.js REST API
 * In-memory storage · Full CRUD · CORS enabled
 */

const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

// ─── App Setup ────────────────────────────────────────────────────────────────

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ─── In-Memory Store ──────────────────────────────────────────────────────────

let tasks = [
  {
    id: uuidv4(),
    text: "Design the landing page",
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const findTask = (id) => tasks.find((t) => t.id === id);

const sendError = (res, status, message) =>
  res.status(status).json({ success: false, error: message });

const sendSuccess = (res, status, data, meta = {}) =>
  res.status(status).json({ success: true, data, ...meta });

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /tasks — fetch all tasks (optional ?completed=true/false filter)
app.get("/tasks", (req, res) => {
  const { completed } = req.query;

  let result = tasks;

  if (completed !== undefined) {
    const isDone = completed === "true";
    result = tasks.filter((t) => t.completed === isDone);
  }

  sendSuccess(res, 200, result, { total: result.length });
});

// GET /tasks/:id — fetch a single task
app.get("/tasks/:id", (req, res) => {
  const task = findTask(req.params.id);
  if (!task) return sendError(res, 404, "Task not found");
  sendSuccess(res, 200, task);
});

// POST /tasks — create a new task
app.post("/tasks", (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== "string" || !text.trim()) {
    return sendError(res, 400, "Field 'text' is required and must be a non-empty string");
  }

  const now = new Date().toISOString();
  const newTask = {
    id: uuidv4(),
    text: text.trim(),
    completed: false,
    createdAt: now,
    updatedAt: now,
  };

  tasks.unshift(newTask); // prepend so newest appears first
  sendSuccess(res, 201, newTask);
});

// PATCH /tasks/:id — update text and/or completed status
app.patch("/tasks/:id", (req, res) => {
  const task = findTask(req.params.id);
  if (!task) return sendError(res, 404, "Task not found");

  const { text, completed } = req.body;

  if (text !== undefined) {
    if (typeof text !== "string" || !text.trim()) {
      return sendError(res, 400, "Field 'text' must be a non-empty string");
    }
    task.text = text.trim();
  }

  if (completed !== undefined) {
    if (typeof completed !== "boolean") {
      return sendError(res, 400, "Field 'completed' must be a boolean");
    }
    task.completed = completed;
  }

  task.updatedAt = new Date().toISOString();
  sendSuccess(res, 200, task);
});

// DELETE /tasks/:id — remove a task
app.delete("/tasks/:id", (req, res) => {
  const index = tasks.findIndex((t) => t.id === req.params.id);
  if (index === -1) return sendError(res, 404, "Task not found");

  const [deleted] = tasks.splice(index, 1);
  sendSuccess(res, 200, deleted);
});

// DELETE /tasks — clear all completed tasks
app.delete("/tasks", (req, res) => {
  const before = tasks.length;
  tasks = tasks.filter((t) => !t.completed);
  const removed = before - tasks.length;
  sendSuccess(res, 200, null, { removed, remaining: tasks.length });
});

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get("/", (req, res) => {
  res.json({
    service: "TODO API",
    version: "1.0.0",
    status: "ok",
    endpoints: [
      "GET    /tasks",
      "GET    /tasks?completed=true|false",
      "GET    /tasks/:id",
      "POST   /tasks",
      "PATCH  /tasks/:id",
      "DELETE /tasks/:id",
      "DELETE /tasks  (clear completed)",
    ],
  });
});

// ─── 404 Catch-all ────────────────────────────────────────────────────────────

app.use((req, res) => {
  sendError(res, 404, `Route ${req.method} ${req.path} not found`);
});

// ─── Global Error Handler ─────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error("[ERROR]", err.stack);
  sendError(res, 500, "Internal server error");
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀  TODO API running at http://localhost:${PORT}`);
  console.log(`📋  Health check: http://localhost:${PORT}/\n`);
});

module.exports = app; // for testing
