import { Router } from "express";
import { db } from "../../db.ts";

export const peopleRoutes = Router();

peopleRoutes.get("/users", (_req, res) => {
    const users = db.prepare("SELECT * FROM users ORDER BY id DESC").all();
    res.json(users);
});

peopleRoutes.post("/users", (req, res) => {
    const { tag_nfc, nickname, rank } = req.body;

    if (!tag_nfc || !nickname || !rank) {
        return res
            .status(400)
            .json({ error: "tag_nfc, nickname, and rank are required" });
    }

    const info = db
        .prepare(
            `
        INSERT INTO users (tag_nfc, nickname, rank)
        VALUES (?, ?, ?)
    `,
        )
        .run(tag_nfc, nickname, rank);

    const user = db
        .prepare("SELECT * FROM users WHERE id = ?")
        .get(info.lastInsertRowid);
    res.status(201).json(user);
});

peopleRoutes.put("/users/:id", (req, res) => {
    const { tag_nfc, nickname, rank } = req.body;

    if (!tag_nfc || !nickname || !rank) {
        return res
            .status(400)
            .json({ error: "tag_nfc, nickname, and rank are required" });
    }

    db.prepare(
        `
        UPDATE users
        SET tag_nfc = ?, nickname = ?, rank = ?
        WHERE id = ?
    `,
    ).run(tag_nfc, nickname, rank, req.params.id);

    res.json({ ok: true });
});

peopleRoutes.delete("/users/:id", (req, res) => {
    db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
    res.status(204).end();
});
