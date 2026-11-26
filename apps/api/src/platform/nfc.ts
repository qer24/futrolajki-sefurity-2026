import express, { Router } from "express";
import { NFC } from "nfc-pcsc";

export interface RawNfcScan {
    uid: string | null;
    type: string;
    atr: string;
    scannedAt: string;
}

export type NfcScanEnricher = (scan: RawNfcScan) => Record<string, unknown>;

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

interface EnrichedNfcScan extends RawNfcScan {
    [key: string]: unknown;
}

const nfcLive = {
    readers: new Set<string>(),
    card: null as EnrichedNfcScan | null,
    lastCard: null as EnrichedNfcScan | null,
};

const sseClients = new Set<express.Response>();

function broadcast(event: string, data: unknown): void {
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

export const nfcRoutes = Router();

nfcRoutes.get("/nfc/stream", (req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
    });

    res.write("retry: 3000\n\n");
    res.write(`event: snapshot\ndata: ${JSON.stringify(snapshot())}\n\n`);

    sseClients.add(res);

    const heartbeat = setInterval(() => res.write(": ping\n\n"), 25_000);
    req.on("close", () => {
        clearInterval(heartbeat);
        sseClients.delete(res);
    });
});

export function startNfcDaemon(enrichScan: NfcScanEnricher): void {
    const nfc = new NFC();

    console.log("NFC Reader Daemon started. Waiting for readers...");

    nfc.on("reader", (reader: Reader) => {
        const name = reader.reader.name;
        console.log(`[+] Device attached: ${name}`);

        nfcLive.readers.add(name);
        broadcast("reader", { name, connected: true });

        reader.on("card", (card: Card) => {
            const uid = card.uid ? card.uid.toUpperCase() : null;
            const rawScan: RawNfcScan = {
                uid,
                type: card.type,
                atr: card.atr.toString("hex").toUpperCase(),
                scannedAt: new Date().toISOString(),
            };
            const scanned: EnrichedNfcScan = {
                ...rawScan,
                ...enrichScan(rawScan),
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
}
