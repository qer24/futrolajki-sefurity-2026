import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { db } from "./db.ts";
import dotenv from "dotenv";
import { NFC } from "nfc-pcsc";

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
// NFC LIVE STREAM (SSE)
// ==========================================

interface DutyResult {
    action: "started" | "ended";
    dutyId: number;
    startTime: string;
    endTime: string | null;
    durationSeconds: number | null; // only set when a duty was ended
}

interface ScannedCard {
    uid: string | null;
    type: string;
    atr: string;
    scannedAt: string;
    user: { id: number; nickname: string; rank: string } | null;
    duty: DutyResult | null;        // set when this tap started / ended a duty
    dutyError: string | null;       // set when toggling the duty failed
}

const nfcLive = {
    readers: new Set<string>(),
    card: null as ScannedCard | null,       // card currently on a reader
    lastCard: null as ScannedCard | null,   // most recent scan
};

const sseClients = new Set<express.Response>();

function broadcast(event: string, data: unknown) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) client.write(payload);
}

function snapshot() {
    return {
        readers: [...nfcLive.readers],
        card: nfcLive.card,
        lastCard: nfcLive.lastCard,
    };
}

app.get("/api/nfc/stream", (req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
    });

    res.write("retry: 3000\n\n");
    res.write(`event: snapshot\ndata: ${JSON.stringify(snapshot())}\n\n`);

    sseClients.add(res);

    // Keep proxies / browsers from closing an idle connection
    const heartbeat = setInterval(() => res.write(": ping\n\n"), 25_000);

    req.on("close", () => {
        clearInterval(heartbeat);
        sseClients.delete(res);
    });
});


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

app.get("/api/duty/history", (_req, res) => {
    const duties = db.prepare(`
        SELECT d.id, d.user_id, d.start_time, d.end_time,
               u.nickname, u.rank, u.tag_nfc
        FROM duty d
        JOIN users u ON u.id = d.user_id
        WHERE d.end_time IS NOT NULL AND d.end_time != ''
        ORDER BY d.end_time DESC
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

const nfc = new NFC();

interface Card {
    type: string;
    uid?: string;
    atr: Buffer;
}

interface Reader {
    reader: { name: string };
    on(event: "card", listener: (card: Card) => void): this;
    on(event: "card.off", listener: (card: Card) => void): this;
    on(event: "error", listener: (err: Error) => void): this;
    on(event: "end", listener: () => void): this;
}

const findUserByTag = db.prepare(
    "SELECT id, nickname, rank FROM users WHERE UPPER(tag_nfc) = UPPER(?)"
);

// ---------- Duty toggle on card tap ----------

// Ignore repeated taps of the same card within this window (card bounce / double tap),
// otherwise a duty could be started and ended instantly.
const TAP_COOLDOWN_MS = 5_000;
const lastTapByUid = new Map<string, number>();

const findActiveDuties = db.prepare(`
    SELECT id, start_time FROM duty
    WHERE user_id = ? AND (end_time IS NULL OR end_time = '')
    ORDER BY start_time ASC
`);
const insertDuty = db.prepare(
    "INSERT INTO duty (user_id, start_time, end_time) VALUES (?, ?, NULL)"
);
const closeDuty = db.prepare("UPDATE duty SET end_time = ? WHERE id = ?");

// Local time without a zone suffix ("YYYY-MM-DDTHH:mm:ss"), so values stay compatible with the
// datetime-local inputs in the CRUD table and still sort correctly as strings.
function localTimestamp(date = new Date()): string {
    const p = (n: number) => String(n).padStart(2, "0");
    return (
        `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}` +
        `T${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
    );
}

/** Starts a duty if the user has none running, otherwise ends the running one(s). */
function toggleDuty(userId: number): DutyResult {
    const now = localTimestamp();

    db.exec("BEGIN IMMEDIATE");
    try {
        const active = findActiveDuties.all(userId) as { id: number; start_time: string }[];

        let result: DutyResult;

        if (active.length === 0) {
            const info = insertDuty.run(userId, now);
            result = {
                action: "started",
                dutyId: Number(info.lastInsertRowid),
                startTime: now,
                endTime: null,
                durationSeconds: null,
            };
        } else {
            for (const duty of active) closeDuty.run(now, duty.id);

            const startMs = new Date(active[0].start_time).getTime();
            result = {
                action: "ended",
                dutyId: active[0].id,
                startTime: active[0].start_time,
                endTime: now,
                durationSeconds: isNaN(startMs)
                    ? null
                    : Math.max(0, Math.round((Date.now() - startMs) / 1000)),
            };
        }

        db.exec("COMMIT");
        return result;
    } catch (err) {
        db.exec("ROLLBACK");
        throw err;
    }
}

console.log("NFC Reader Daemon started. Waiting for readers...");

nfc.on("reader", (reader: Reader) => {
    const name = reader.reader.name;
    console.log(`[+] Device attached: ${name}`);

    nfcLive.readers.add(name);
    broadcast("reader", { name, connected: true });

    reader.on("card", (card: Card) => {
        const uid = card.uid ? card.uid.toUpperCase() : null;
        const user = uid ? ((findUserByTag.get(uid) as ScannedCard["user"]) ?? null) : null;

        let duty: DutyResult | null = null;
        let dutyError: string | null = null;

        if (user && uid) {
            const sinceLastTap = Date.now() - (lastTapByUid.get(uid) ?? 0);

            if (sinceLastTap < TAP_COOLDOWN_MS) {
                console.log(`[duty] ${user.nickname}: tap ignored (cooldown)`);
            } else {
                try {
                    duty = toggleDuty(user.id);
                    lastTapByUid.set(uid, Date.now());
                    console.log(`[duty] ${user.nickname}: ${duty.action}`);
                } catch (err) {
                    console.error(`[!] Duty toggle failed for ${user.nickname}:`, err);
                    dutyError = err instanceof Error ? err.message : "unknown error";
                }
            }
        }

        const scanned: ScannedCard = {
            uid,
            type: card.type,
            atr: card.atr.toString("hex").toUpperCase(),
            scannedAt: new Date().toISOString(),
            user,
            duty,
            dutyError,
        };

        console.log(`[card] ${uid ?? "no uid"} (${card.type})`);

        nfcLive.card = scanned;
        nfcLive.lastCard = scanned;
        broadcast("card", scanned);
    });

    reader.on("card.off", () => {
        console.log(`[-] Card removed from: ${name}`);
        nfcLive.card = null;
        broadcast("card-off", { reader: name });
    });

    reader.on("error", (err: Error) => {
        console.error(`[!] Reader Error (${name}):`, err);
        broadcast("nfc-error", { reader: name, message: err.message });
    });

    reader.on("end", () => {
        console.log(`[-] Device detached: ${name}`);
        nfcLive.readers.delete(name);
        nfcLive.card = null;
        broadcast("reader", { name, connected: false });
    });
});

nfc.on("error", (err: Error) => {
    console.error("[!] Global NFC Error:", err);
    broadcast("nfc-error", { message: err.message });
});
