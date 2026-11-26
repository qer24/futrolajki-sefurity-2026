import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { db } from "./db.ts";
import { initializePeopleSchema } from "./modules/people/schema.ts";
import { peopleRoutes } from "./modules/people/routes.ts";
import { initializeDutySchema } from "./modules/duty/schema.ts";
import { dutyRoutes } from "./modules/duty/routes.ts";
import { createDutyNfcHandler } from "./modules/duty/nfc.ts";
import { nfcRoutes, startNfcDaemon } from "./platform/nfc.ts";
import { initializeCountersSchema } from "./modules/counters/schema.ts";
import { counterRoutes } from "./modules/counters/routes.ts";

dotenv.config();

initializePeopleSchema();
initializeDutySchema();
initializeCountersSchema();
db.prepare("SELECT 1").get();

const app = express();

app.use(
    cors({
        origin: "http://localhost:5173",
    }),
);
app.use(express.json());
app.use(
    "/api",
    rateLimit({
        windowMs: 60 * 1000,
        limit: 120,
        standardHeaders: true,
        legacyHeaders: false,
    }),
);

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api", peopleRoutes, dutyRoutes, counterRoutes, nfcRoutes);

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`API running on http://localhost:${port}`));

startNfcDaemon(createDutyNfcHandler());
