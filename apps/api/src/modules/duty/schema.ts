import { db } from "../../db.ts";

export function initializeDutySchema(): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS duty (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            start_time DATETIME NOT NULL,
            end_time DATETIME,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    `);
}
