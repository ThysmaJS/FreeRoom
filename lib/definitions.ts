import * as z from "zod";

export const SignupFormSchema = z.object({
  name: z
    .string()
    .min(2, { error: "Le nom doit contenir au moins 2 caractères." })
    .trim(),
  email: z.email({ error: "Merci de saisir un email valide." }).trim(),
  password: z
    .string()
    .min(8, { error: "Le mot de passe doit contenir au moins 8 caractères." })
    .trim(),
});

export const LoginFormSchema = z.object({
  email: z.email({ error: "Merci de saisir un email valide." }).trim(),
  password: z
    .string()
    .min(1, { error: "Merci de saisir votre mot de passe." })
    .trim(),
});

export type SignupFormState =
  | {
      errors?: {
        name?: string[];
        email?: string[];
        password?: string[];
      };
      message?: string;
    }
  | undefined;

export type LoginFormState =
  | {
      errors?: {
        email?: string[];
        password?: string[];
      };
      message?: string;
    }
  | undefined;

export type SessionPayload = {
  userId: number;
  expiresAt: Date;
};
