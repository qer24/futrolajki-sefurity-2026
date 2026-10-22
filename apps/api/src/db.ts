import Database from "better-sqlite3";

export const db = new Database(process.env.DB_PATH ?? "app.db");

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tag_nfc TEXT NOT NULL,
        nickname TEXT NOT NULL,
        rank TEXT CHECK(rank IN ('porzadkowa', 'info', 'lider', 'koord', 'org', 'sekretarka')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS duty (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
`);
