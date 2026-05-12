import type { RequestHandler } from "express";
import type { z } from "zod";

export function validate<T extends z.ZodTypeAny>(schema: T): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        field: issue.path.length ? issue.path.join(".") : "_root",
        message: issue.message,
      }));
      return res.status(400).json({ error: "Validación fallida", issues });
    }
    req.body = result.data;
    next();
  };
}
