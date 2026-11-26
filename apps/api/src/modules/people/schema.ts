import { db } from "../../db.ts";

export function initializePeopleSchema(): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tag_nfc TEXT NOT NULL,
            nickname TEXT NOT NULL,
            rank TEXT CHECK(rank IN ('porzadkowa', 'info', 'dowodca')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
}
