import { z } from "zod";

/** Letras Unicode (cualquier script), espacios y guiones. */
const namePattern = /^[\p{L}\s-]+$/u;

export const registrationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(120, "El nombre no puede superar 120 caracteres")
    .regex(namePattern, "El nombre solo puede contener letras, espacios o guiones"),
  email: z
    .string()
    .trim()
    .max(255, "El correo no puede superar 255 caracteres")
    .transform((s) => s.toLowerCase())
    .pipe(z.string().email("Correo electrónico no válido")),
  message: z.string().trim().max(1000, "El mensaje no puede superar 1000 caracteres").optional(),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;
