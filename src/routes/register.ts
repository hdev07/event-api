import { Router } from "express";
import type { ResultSetHeader } from "mysql2/promise";
import { getPool } from "../db.js";
import { validate } from "../middleware/validate.js";
import { registrationSchema, type RegistrationInput } from "../schemas/registration.js";

const router = Router();

function isDuplicateEmailError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const code = "code" in err && typeof (err as { code: unknown }).code === "string"
    ? (err as { code: string }).code
    : undefined;
  const errno = "errno" in err && typeof (err as { errno: unknown }).errno === "number"
    ? (err as { errno: number }).errno
    : undefined;
  return code === "ER_DUP_ENTRY" || errno === 1062;
}

router.post("/", validate(registrationSchema), async (req, res, next) => {
  const { name, email, message } = req.body as RegistrationInput;
  const ip = req.ip ?? null;
  const userAgent = req.get("user-agent") ?? null;

  try {
    const pool = getPool();
    const [result] = await pool.execute(
      `INSERT INTO registrations (name, email, message, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?)`,
      [name, email, message ?? null, ip, userAgent],
    );
    const header = result as ResultSetHeader;
    res.status(201).json({ id: header.insertId ?? null });
  } catch (err) {
    if (isDuplicateEmailError(err)) {
      res.status(409).json({ error: "Este correo ya está registrado" });
      return;
    }
    next(err);
  }
});

export default router;
