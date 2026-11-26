import { db } from "../../db.ts";

export function initializeCountersSchema(): void {
  db.exec(`
        CREATE TABLE IF NOT EXISTS counters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            current_count INTEGER NOT NULL DEFAULT 0 CHECK (current_count >= 0),
            max_count INTEGER CHECK (max_count IS NULL OR max_count >= 0),
            created_by TEXT NOT NULL DEFAULT 'Temporary user',
            created_at DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')),
            last_edit DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
        );
    `);
}
