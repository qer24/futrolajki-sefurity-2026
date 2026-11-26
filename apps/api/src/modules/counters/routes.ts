import { Router } from "express";
import { db } from "../../db.ts";

export const counterRoutes = Router();

function parseCounterInput(
  body: unknown,
): { name: string; maxCount: number | null } | null {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  const fields = body as Record<string, unknown>;
  if (
    typeof fields.name !== "string" ||
    !fields.name.trim() ||
    fields.name.trim().length > 120
  ) {
    return null;
  }

  const rawMax = fields.max_count;
  if (rawMax === undefined || rawMax === null || rawMax === "") {
    return { name: fields.name.trim(), maxCount: null };
  }

  if (
    typeof rawMax !== "number" ||
    !Number.isSafeInteger(rawMax) ||
    rawMax < 0
  ) {
    return null;
  }

  return { name: fields.name.trim(), maxCount: rawMax };
}

function parseId(rawId: string): number | null {
  const id = Number(rawId);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

counterRoutes.get("/counters", (_req, res) => {
  const counters = db.prepare("SELECT * FROM counters ORDER BY id DESC").all();
  res.json(counters);
});

counterRoutes.post("/counters", (req, res) => {
  const input = parseCounterInput(req.body);
  if (!input) {
    return res.status(400).json({
      error: "A non-empty name and a valid optional maximum are required",
    });
  }

  const result = db
    .prepare("INSERT INTO counters (name, max_count) VALUES (?, ?)")
    .run(input.name, input.maxCount);
  const counter = db
    .prepare("SELECT * FROM counters WHERE id = ?")
    .get(result.lastInsertRowid);

  res.status(201).json(counter);
});

counterRoutes.put("/counters/:id", (req, res) => {
  const id = parseId(req.params.id);
  const input = parseCounterInput(req.body);
  if (id === null || !input) {
    return res.status(400).json({
      error:
        "A valid counter ID, non-empty name, and valid optional maximum are required",
    });
  }

  const result = db
    .prepare(
      "UPDATE counters SET name = ?, max_count = ?, last_edit = strftime('%Y-%m-%d %H:%M:%f', 'now') WHERE id = ?",
    )
    .run(input.name, input.maxCount, id);
  if (result.changes === 0) {
    return res.status(404).json({ error: "Counter not found" });
  }

  const counter = db.prepare("SELECT * FROM counters WHERE id = ?").get(id);
  res.json(counter);
});

counterRoutes.post("/counters/:id/increment", (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: "Invalid counter ID" });
  }

  const result = db
    .prepare(
      "UPDATE counters SET current_count = current_count + 1, last_edit = strftime('%Y-%m-%d %H:%M:%f', 'now') WHERE id = ?",
    )
    .run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: "Counter not found" });
  }

  res.json(db.prepare("SELECT * FROM counters WHERE id = ?").get(id));
});

counterRoutes.post("/counters/:id/decrement", (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: "Invalid counter ID" });
  }

  const result = db
    .prepare(
      "UPDATE counters SET current_count = MAX(current_count - 1, 0), last_edit = strftime('%Y-%m-%d %H:%M:%f', 'now') WHERE id = ?",
    )
    .run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: "Counter not found" });
  }

  res.json(db.prepare("SELECT * FROM counters WHERE id = ?").get(id));
});

counterRoutes.delete("/counters/:id", (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: "Invalid counter ID" });
  }

  const result = db.prepare("DELETE FROM counters WHERE id = ?").run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: "Counter not found" });
  }

  res.status(204).end();
});
