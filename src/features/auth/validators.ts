import { z } from "zod";

// Shared input rules for the login and password forms/actions.
export const emailSchema = z.string().trim().toLowerCase().email("Email invalide").max(254);

/** Policy for NEW passwords (login only checks presence, so old passwords still work). */
export const passwordSchema = z
  .string()
  .min(12, "12 caractères minimum")
  .max(128, "128 caractères maximum")
  .regex(/[A-Za-z]/, "Au moins une lettre")
  .regex(/\d/, "Au moins un chiffre");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Mot de passe requis").max(128),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const createAdminSchema = z.object({
  name: z.string().trim().min(1, "Le nom est obligatoire.").max(120, "Le nom ne peut pas dépasser 120 caractères."),
  email: emailSchema,
  password: passwordSchema,
  confirm: z.string(),
}).refine((data) => data.password === data.confirm, {
  path: ["confirm"],
  message: "Les mots de passe ne correspondent pas.",
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20).max(200),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Les mots de passe ne correspondent pas" });

export const changePasswordSchema = z
  .object({
    current: z.string().min(1, "Mot de passe actuel requis").max(128),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Les mots de passe ne correspondent pas" });

export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
