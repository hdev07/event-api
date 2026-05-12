import "dotenv/config";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { pingDb } from "./db.js";
import { errorHandler } from "./middleware/errorHandler.js";
import registerRouter from "./routes/register.js";

const app = express();
const port = Number(process.env.PORT?.trim() || "4000");
const corsOrigins =
  process.env.CORS_ORIGIN?.trim().split(",").map((s) => s.trim()) ?? ["http://localhost:5173"];

app.set("trust proxy", 1);

app.use(helmet());
app.use(express.json({ limit: "10kb" }));
app.use(
  cors({
    origin: corsOrigins,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  }),
);

const apiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes. Intenta de nuevo en unos minutos." },
});

app.get("/health", async (_req, res) => {
  try {
    const dbOk = await pingDb();
    res.json({ ok: true, db: dbOk ? "up" : "down" });
  } catch {
    res.status(503).json({ ok: false, db: "down" });
  }
});

app.use("/api", apiLimiter);
app.use("/api/register", registerRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "No encontrado" });
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`API en http://localhost:${port}`);
});
