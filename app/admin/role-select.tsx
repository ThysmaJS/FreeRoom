"use client";

import { useState, useTransition } from "react";
import { setUserRole } from "@/lib/actions/admin";
import { ROLES, type UserRole } from "@/lib/roles";

export default function RoleSelect({
  userId,
  initialRole,
  disabled,
}: {
  userId: number;
  initialRole: UserRole;
  disabled: boolean;
}) {
  const [role, setRole] = useState(initialRole);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value;
    setError(null);
    startTransition(async () => {
      const result = await setUserRole(userId, next);
      if (result.ok) {
        setRole(next as UserRole);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1 sm:items-start">
      <select
        value={role}
        onChange={handleChange}
        disabled={disabled || isPending}
        className="w-full rounded-full border border-border-strong bg-background px-3.5 py-1.5 text-sm font-black text-foreground transition-opacity focus-visible:border-accent disabled:opacity-50"
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      {error && <p className="max-w-48 text-right text-xs text-danger sm:text-left">{error}</p>}
    </div>
  );
}
