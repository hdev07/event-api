import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  console.error(err);
  const isProd = process.env.NODE_ENV === "production";
  const status =
    typeof err === "object" &&
    err !== null &&
    "statusCode" in err &&
    typeof (err as { statusCode: unknown }).statusCode === "number"
      ? (err as { statusCode: number }).statusCode
      : 500;
  if (isProd) {
    res.status(status).json({ error: "Error interno del servidor" });
    return;
  }
  const message = err instanceof Error ? err.message : "Error desconocido";
  const stack = err instanceof Error ? err.stack : undefined;
  res.status(status).json({ error: message, stack });
};
