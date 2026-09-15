"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";
import { checkRateLimit, getClientKey } from "@/lib/rate-limit";
import {
  LoginFormSchema,
  SignupFormSchema,
  type LoginFormState,
  type SignupFormState,
} from "@/lib/definitions";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;

function rateLimitMessage(retryAfterSeconds: number) {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Trop de tentatives. Réessayez dans ${minutes} min.`;
}

export async function signup(
  _state: SignupFormState,
  formData: FormData
): Promise<SignupFormState> {
  const clientKey = await getClientKey();
  const rateLimit = checkRateLimit(`signup:${clientKey}`, {
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX_ATTEMPTS,
  });
  if (!rateLimit.allowed) {
    return { message: rateLimitMessage(rateLimit.retryAfterSeconds) };
  }

  const validatedFields = SignupFormSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { name, email, password } = validatedFields.data;
  const passwordHash = await bcrypt.hash(password, 10);

  let userId: number;
  try {
    const rows = await sql<{ id: number }[]>`
      INSERT INTO users (name, email, password_hash)
      VALUES (${name}, ${email}, ${passwordHash})
      RETURNING id
    `;
    userId = rows[0].id;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
    ) {
      return { errors: { email: ["Un compte existe déjà avec cet email."] } };
    }
    return { message: "Une erreur est survenue, réessayez." };
  }

  await createSession(userId);
  redirect("/");
}

export async function login(
  _state: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const clientKey = await getClientKey();
  const rateLimit = checkRateLimit(`login:${clientKey}`, {
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX_ATTEMPTS,
  });
  if (!rateLimit.allowed) {
    return { message: rateLimitMessage(rateLimit.retryAfterSeconds) };
  }

  const validatedFields = LoginFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { email, password } = validatedFields.data;

  const rows = await sql<{ id: number; password_hash: string }[]>`
    SELECT id, password_hash FROM users WHERE email = ${email}
  `;
  const user = rows[0];

  const passwordsMatch = user
    ? await bcrypt.compare(password, user.password_hash)
    : false;

  if (!user || !passwordsMatch) {
    return { message: "Email ou mot de passe incorrect." };
  }

  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
