import { z } from "zod";

export const registerBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(120, "El nombre es demasiado largo"),
  email: z
    .string()
    .trim()
    .email("Correo electrónico no válido")
    .max(255, "El correo es demasiado largo"),
  message: z
    .string()
    .trim()
    .min(5, "El mensaje debe tener al menos 5 caracteres")
    .max(2000, "El mensaje es demasiado largo"),
});
