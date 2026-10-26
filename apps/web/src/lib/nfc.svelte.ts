import { apiFetch } from "$lib/api.js";

// ---------- Types ----------

export interface NfcUser {
    id: number;
    nickname: string;
    rank: string;
}

export interface DutyResult {
    action: "started" | "ended";
    dutyId: number;
    startTime: string;
    endTime: string | null;
    durationSeconds: number | null; // only set when a duty was ended
}

export interface ScannedCard {
    uid: string | null;
    type: string;
    atr: string;
    scannedAt: string;
    user: NfcUser | null;
    duty: DutyResult | null;     // set when this tap started / ended a duty
    dutyError: string | null;    // set when toggling the duty failed
}

export interface NfcState {
    streaming: boolean;
    readers: string[];
    card: ScannedCard | null;     // card currently on the reader
    lastCard: ScannedCard | null; // last scan (stays after removal)
    error: string | null;
}

/** Payloads of each SSE event sent by the backend. */
interface NfcEvents {
    snapshot: { readers: string[]; card: ScannedCard | null; lastCard: ScannedCard | null };
    reader: { name: string; connected: boolean };
    card: ScannedCard;
    "card-off": { reader: string };
    "nfc-error": { reader?: string; message: string };
}

type NfcEventName = keyof NfcEvents;

// ---------- State ----------

export const nfc: NfcState = $state({
    streaming: false,
    readers: [],
    card: null,
    lastCard: null,
    error: null
});

let controller: AbortController | null = null;

// ---------- Event handling ----------

const handlers: { [K in NfcEventName]: (data: NfcEvents[K]) => void } = {
    snapshot(data) {
        nfc.readers = data.readers;
        nfc.card = data.card;
        nfc.lastCard = data.lastCard;
    },
    reader(data) {
        nfc.readers = data.connected
            ? [...new Set([...nfc.readers, data.name])]
            : nfc.readers.filter((r) => r !== data.name);
        if (!data.connected) nfc.card = null;
    },
    card(data) {
        nfc.card = data;
        nfc.lastCard = data;
    },
    "card-off"() {
        nfc.card = null;
    },
    "nfc-error"(data) {
        nfc.error = data.message;
    }
};

function isNfcEvent(name: string): name is NfcEventName {
    return name in handlers;
}

function parseChunk(raw: string): void {
    let event = "message";
    const dataLines: string[] = [];

    for (const line of raw.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }

    if (!dataLines.length || !isNfcEvent(event)) return; // heartbeat / unknown event

    try {
        const data: unknown = JSON.parse(dataLines.join("\n"));
        (handlers[event] as (d: unknown) => void)(data);
    } catch (e) {
        console.error("Bad SSE payload", e);
    }
}

// ---------- Stream control ----------

export function startNfcStream(): void {
    if (controller) return; // already running

    const ctrl = new AbortController();
    controller = ctrl;
    const { signal } = ctrl;

    void (async () => {
        while (!signal.aborted) {
            try {
                const res = await apiFetch("/nfc/stream", { signal });
                if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

                nfc.streaming = true;
                nfc.error = null;

                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

                    let idx: number;
                    while ((idx = buffer.indexOf("\n\n")) !== -1) {
                        parseChunk(buffer.slice(0, idx));
                        buffer = buffer.slice(idx + 2);
                    }
                }
            } catch (e) {
                if (signal.aborted) return;
                nfc.error = e instanceof Error ? e.message : String(e);
            }

            nfc.streaming = false;
            await new Promise((r) => setTimeout(r, 3000)); // reconnect delay
        }
    })();
}

export function stopNfcStream(): void {
    controller?.abort();
    controller = null;
    nfc.streaming = false;
}
