import { Router } from "express";
import { db } from "../../db.ts";

export const dutyRoutes = Router();

dutyRoutes.get("/duty", (_req, res) => {
    const duties = db
        .prepare("SELECT * FROM duty ORDER BY start_time DESC")
        .all();
    res.json(duties);
});

dutyRoutes.post("/duty", (req, res) => {
    const { user_id, start_time, end_time } = req.body;

    if (!user_id || !start_time) {
        return res
            .status(400)
            .json({ error: "user_id, start_time are required" });
    }

    const info = db
        .prepare(
            `
        INSERT INTO duty (user_id, start_time, end_time)
        VALUES (?, ?, ?)
    `,
        )
        .run(user_id, start_time, end_time);

    const duty = db
        .prepare("SELECT * FROM duty WHERE id = ?")
        .get(info.lastInsertRowid);
    res.status(201).json(duty);
});

dutyRoutes.get("/duty/active", (_req, res) => {
    const duties = db
        .prepare(
            `
        SELECT d.id, d.user_id, d.start_time,
               u.nickname, u.rank, u.tag_nfc
        FROM duty d
        JOIN users u ON u.id = d.user_id
        WHERE d.end_time IS NULL OR d.end_time = ''
        ORDER BY d.start_time DESC
    `,
        )
        .all();
    res.json(duties);
});

dutyRoutes.get("/duty/history", (_req, res) => {
    const duties = db
        .prepare(
            `
        SELECT d.id, d.user_id, d.start_time, d.end_time,
               u.nickname, u.rank, u.tag_nfc
        FROM duty d
        JOIN users u ON u.id = d.user_id
        WHERE d.end_time IS NOT NULL AND d.end_time != ''
        ORDER BY d.end_time DESC
    `,
        )
        .all();
    res.json(duties);
});

dutyRoutes.put("/duty/:id", (req, res) => {
    const { user_id, start_time, end_time } = req.body;

    if (!user_id || !start_time) {
        return res
            .status(400)
            .json({ error: "user_id, start_time are required" });
    }

    db.prepare(
        `
        UPDATE duty
        SET user_id = ?, start_time = ?, end_time = ?
        WHERE id = ?
    `,
    ).run(user_id, start_time, end_time, req.params.id);

    res.json({ ok: true });
});

dutyRoutes.delete("/duty/:id", (req, res) => {
    db.prepare("DELETE FROM duty WHERE id = ?").run(req.params.id);
    res.status(204).end();
});
