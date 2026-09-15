"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup } from "@/lib/actions/auth";

const inputClass =
  "w-full rounded-2xl border border-border-strong bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus-visible:border-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-glow";

export default function SignupForm() {
  const [state, action, pending] = useActionState(signup, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-black">
          Nom
        </label>
        <input
          id="name"
          name="name"
          placeholder="Jeanne Dupont"
          className={inputClass}
        />
        {state?.errors?.name && (
          <p className="text-sm text-danger">{state.errors.name[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-black">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="jeanne.dupont@esgi.fr"
          className={inputClass}
        />
        {state?.errors?.email && (
          <p className="text-sm text-danger">{state.errors.email[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-black">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className={inputClass}
        />
        {state?.errors?.password && (
          <p className="text-sm text-danger">{state.errors.password[0]}</p>
        )}
      </div>

      {state?.message && <p className="text-sm text-danger">{state.message}</p>}

      <button
        disabled={pending}
        type="submit"
        className="glow mt-2 rounded-full bg-navy px-4 py-2.5 font-black text-white transition-opacity hover:opacity-90 disabled:opacity-60 dark:bg-cyan dark:text-accent-ink"
      >
        {pending ? "Création..." : "Créer mon compte"}
      </button>

      <p className="text-center text-sm text-muted">
        Déjà un compte ?{" "}
        <Link href="/login" className="text-navy underline dark:text-cyan">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
