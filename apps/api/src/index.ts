import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { db } from "./db.ts";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const APP_PASSWORD = process.env.APP_PASSWORD ?? "admin";

app.use(
    cors({
        origin: "http://localhost:5173",
        allowedHeaders: ["content-type", "x-api-password"]
    })
);
app.use(express.json());
app.use(
    "/api",
    rateLimit({
        windowMs: 60 * 1000,
        limit: 120,
        standardHeaders: true,
        legacyHeaders: false
    })
);

app.post("/api/auth/login", (req, res) => {
    const password = String(req.body?.password ?? "");

    if (!password) {
        return res.status(400).json({ ok: false, error: "password is required" });
    }

    if (password !== APP_PASSWORD) {
        return res.status(401).json({ ok: false, error: "invalid password" });
    }

    return res.json({ ok: true });
});

// Authentication middleware for all subsequent routes
app.use("/api", (req, res, next) => {
    const password = req.header("x-api-password");

    if (password !== APP_PASSWORD) {
        return res.status(401).json({ ok: false, error: "authentication required" });
    }

    next();
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));


// ==========================================
// USERS ROUTES
// ==========================================

app.get("/api/users", (_req, res) => {
    const users = db.prepare("SELECT * FROM users ORDER BY id DESC").all();
    res.json(users);
});

app.post("/api/users", (req, res) => {
    const { tag_nfc, nickname, rank } = req.body;

    if (!tag_nfc || !nickname || !rank) {
        return res.status(400).json({ error: "tag_nfc, nickname, and rank are required" });
    }

    const info = db.prepare(`
        INSERT INTO users (tag_nfc, nickname, rank) 
        VALUES (?, ?, ?)
    `).run(tag_nfc, nickname, rank);

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
    res.status(201).json(user);
});

app.put("/api/users/:id", (req, res) => {
    const { tag_nfc, nickname, rank } = req.body;

    if (!tag_nfc || !nickname || !rank) {
        return res.status(400).json({ error: "tag_nfc, nickname, and rank are required" });
    }

    db.prepare(`
        UPDATE users 
        SET tag_nfc = ?, nickname = ?, rank = ? 
        WHERE id = ?
    `).run(tag_nfc, nickname, rank, req.params.id);

    res.json({ ok: true });
});

app.delete("/api/users/:id", (req, res) => {
    db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
    res.status(204).end();
});


// ==========================================
// DUTY ROUTES
// ==========================================

app.get("/api/duty", (_req, res) => {
    const duties = db.prepare("SELECT * FROM duty ORDER BY start_time DESC").all();
    res.json(duties);
});

app.post("/api/duty", (req, res) => {
    const { user_id, start_time, end_time } = req.body;

    if (!user_id || !start_time) {
        return res.status(400).json({ error: "user_id, start_time are required" });
    }

    const info = db.prepare(`
        INSERT INTO duty (user_id, start_time, end_time) 
        VALUES (?, ?, ?)
    `).run(user_id, start_time, end_time);

    const duty = db.prepare("SELECT * FROM duty WHERE id = ?").get(info.lastInsertRowid);
    res.status(201).json(duty);
});

app.get("/api/duty/active", (_req, res) => {
    const duties = db.prepare(`
        SELECT d.id, d.user_id, d.start_time,
               u.nickname, u.rank, u.tag_nfc
        FROM duty d
        JOIN users u ON u.id = d.user_id
        WHERE d.end_time IS NULL OR d.end_time = ''
        ORDER BY d.start_time DESC
    `).all();
    res.json(duties);
});

app.put("/api/duty/:id", (req, res) => {
    const { user_id, start_time, end_time } = req.body;

    if (!user_id || !start_time) {
        return res.status(400).json({ error: "user_id, start_time are required" });
    }

    db.prepare(`
        UPDATE duty 
        SET user_id = ?, start_time = ?, end_time = ? 
        WHERE id = ?
    `).run(user_id, start_time, end_time, req.params.id);

    res.json({ ok: true });
});

app.delete("/api/duty/:id", (req, res) => {
    db.prepare("DELETE FROM duty WHERE id = ?").run(req.params.id);
    res.status(204).end();
});


db.prepare("SELECT 1").get();

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
