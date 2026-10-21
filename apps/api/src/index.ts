import express from "express";
import cors from "cors";
import { db } from "./db.js";

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/todos", (_req, res) => {
    const todos = db.prepare("SELECT * FROM todos ORDER BY id DESC").all();
    res.json(todos);
});

app.post("/api/todos", (req, res) => {
    const title = String(req.body?.title ?? "").trim();
    if (!title) return res.status(400).json({ error: "title is required" });

    const info = db.prepare("INSERT INTO todos (title) VALUES (?)").run(title);
    const todo = db.prepare("SELECT * FROM todos WHERE id = ?").get(info.lastInsertRowid);
    res.status(201).json(todo);
});

app.patch("/api/todos/:id", (req, res) => {
    db.prepare("UPDATE todos SET done = ? WHERE id = ?").run(req.body.done ? 1 : 0, req.params.id);
    res.json({ ok: true });
});

app.delete("/api/todos/:id", (req, res) => {
    db.prepare("DELETE FROM todos WHERE id = ?").run(req.params.id);
    res.status(204).end();
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
