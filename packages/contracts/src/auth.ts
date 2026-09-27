import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

/**
 * Contraseñas que aparecen en las primeras posiciones de las filtraciones
 * públicas y cumplen el largo mínimo. NIST SP 800-63B pide rechazarlas en
 * lugar de exigir reglas de composición.
 */
const COMMON_PASSWORDS = new Set([
  "123456789012",
  "1234567890123",
  "12345678901234",
  "qwertyuiopas",
  "qwerty123456",
  "password1234",
  "password12345",
  "passwordpassword",
  "contraseña123",
  "contrasena123",
  "contraseña1234",
  "contrasena1234",
  "iloveyou1234",
  "aaaaaaaaaaaa",
  "111111111111",
  "000000000000",
  "abcdefghijkl",
  "abc123456789",
  "adminadmin123",
  "administrador",
  "bienvenido123",
  "welcome12345",
  "letmein12345",
  "colombia1234",
  "rutasegura123",
  "interrapidisimo",
]);

export const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email());

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH)
  .max(PASSWORD_MAX_LENGTH)
  .refine((value) => !COMMON_PASSWORDS.has(value.toLowerCase()), {
    message: "es una contraseña común",
  });

export const registerRequestSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    fullName: z.string().trim().min(2).max(120),
  })
  .strict()
  .refine(
    (data) => {
      const localPart = data.email.split("@")[0] ?? "";
      return localPart.length < 4 || !data.password.toLowerCase().includes(localPart);
    },
    { path: ["password"], message: "no puede contener el correo" },
  );

export type RegisterRequest = z.infer<typeof registerRequestSchema>;

/**
 * En el login solo se limita el tamaño: aplicar aquí la política completa
 * revelaría qué contraseñas nunca pudieron existir.
 */
export const loginRequestSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  })
  .strict();

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const userRoleSchema = z.enum(["customer", "operator", "admin"]);

export type UserRole = z.infer<typeof userRoleSchema>;

export const authUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  fullName: z.string(),
  role: userRoleSchema,
});

export type AuthUser = z.infer<typeof authUserSchema>;

export const authUserResponseSchema = z.object({ user: authUserSchema });

export const registerResponseSchema = z.object({ status: z.literal("accepted") });
