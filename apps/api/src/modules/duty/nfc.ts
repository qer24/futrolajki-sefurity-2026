import { db } from "../../db.ts";
import type { NfcScanEnricher, RawNfcScan } from "../../platform/nfc.ts";

interface DutyResult {
    action: "started" | "ended";
    dutyId: number;
    startTime: string;
    endTime: string | null;
    durationSeconds: number | null;
}

interface DutyScanUser {
    id: number;
    nickname: string;
    rank: string;
}

const TAP_COOLDOWN_MS = 5_000;

function localTimestamp(date = new Date()): string {
    const p = (n: number) => String(n).padStart(2, "0");
    return (
        `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}` +
        `T${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
    );
}

export function createDutyNfcHandler(): NfcScanEnricher {
    const findUserByTag = db.prepare(
        "SELECT id, nickname, rank FROM users WHERE UPPER(tag_nfc) = UPPER(?)",
    );
    const findActiveDuties = db.prepare(`
        SELECT id, start_time FROM duty
        WHERE user_id = ? AND (end_time IS NULL OR end_time = '')
        ORDER BY start_time ASC
    `);
    const insertDuty = db.prepare(
        "INSERT INTO duty (user_id, start_time, end_time) VALUES (?, ?, NULL)",
    );
    const closeDuty = db.prepare("UPDATE duty SET end_time = ? WHERE id = ?");
    const lastTapByUid = new Map<string, number>();

    function toggleDuty(userId: number): DutyResult {
        const now = localTimestamp();

        db.exec("BEGIN IMMEDIATE");
        try {
            const active = findActiveDuties.all(userId) as {
                id: number;
                start_time: string;
            }[];

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
                        : Math.max(
                              0,
                              Math.round((Date.now() - startMs) / 1000),
                          ),
                };
            }

            db.exec("COMMIT");
            return result;
        } catch (err) {
            db.exec("ROLLBACK");
            throw err;
        }
    }

    return (scan: RawNfcScan) => {
        const user = scan.uid
            ? ((findUserByTag.get(scan.uid) as DutyScanUser | undefined) ??
              null)
            : null;

        let duty: DutyResult | null = null;
        let dutyError: string | null = null;

        if (user && scan.uid) {
            const sinceLastTap = Date.now() - (lastTapByUid.get(scan.uid) ?? 0);

            if (sinceLastTap >= TAP_COOLDOWN_MS) {
                try {
                    duty = toggleDuty(user.id);
                    lastTapByUid.set(scan.uid, Date.now());
                    console.log(`[duty] ${user.nickname}: ${duty.action}`);
                } catch (err) {
                    console.error(
                        `[!] Duty toggle failed for ${user.nickname}:`,
                        err,
                    );
                    dutyError =
                        err instanceof Error ? err.message : "unknown error";
                }
            } else {
                console.log(`[duty] ${user.nickname}: tap ignored (cooldown)`);
            }
        }

        return { user, duty, dutyError };
    };
}
