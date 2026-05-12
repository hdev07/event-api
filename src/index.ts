import "dotenv/config";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import type { ResultSetHeader } from "mysql2/promise";
import { getPool, pingDb } from "./db.js";
import { registerBodySchema } from "./validation.js";

const app = express();
const port = Number(process.env.PORT?.trim() || "4000");
const corsOrigin =
  process.env.CORS_ORIGIN?.trim() || "http://localhost:5173";

app.use(helmet());
app.use(
  cors({
    origin: corsOrigin.split(",").map((s) => s.trim()),
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  }),
);
app.use(express.json({ limit: "32kb" }));

const registerLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Espera un minuto." },
});

app.get("/api/health", async (_req, res) => {
  try {
    const dbOk = await pingDb();
    res.json({ ok: true, db: dbOk ? "up" : "down" });
  } catch {
    res.status(503).json({ ok: false, db: "down" });
  }
});

app.post("/api/register", registerLimiter, async (req, res) => {
  const parsed = registerBodySchema.safeParse(req.body);
  if (!parsed.success) {
    const flat = zodFieldErrors(parsed.error);
    return res.status(400).json({ error: "Validación fallida", issues: flat });
  }
  const { name, email, message } = parsed.data;
  try {
    const pool = getPool();
    const [result] = await pool.execute(
      "INSERT INTO registrations (name, email, message) VALUES (?, ?, ?)",
      [name, email, message],
    );
    const header = result as ResultSetHeader;
    res.status(201).json({ ok: true, id: header.insertId ?? null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "No se pudo guardar el registro" });
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: "No encontrado" });
});

app.listen(port, () => {
  console.log(`API en http://localhost:${port}`);
});

function zodFieldErrors(err: import("zod").ZodError) {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const path = issue.path.length ? issue.path.join(".") : "_root";
    if (!out[path]) out[path] = [];
    out[path].push(issue.message);
  }
  return out;
}
