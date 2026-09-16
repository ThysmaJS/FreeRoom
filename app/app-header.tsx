import Link from "next/link";
import {
  CalendarCheck,
  DoorOpen,
  LayoutGrid,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { logout } from "@/lib/actions/auth";
import type { UserRole } from "@/lib/roles";
import ThemeToggle from "./theme-toggle";

export default function AppHeader({
  userName,
  active,
  role,
}: {
  userName: string;
  active: "grid" | "reservations" | "admin";
  role: UserRole;
}) {
  const isSuperAdmin = role === "superadmin";
  return (
    <header className="bg-navy text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-8">
        <div className="flex shrink-0 items-center gap-2">
          <DoorOpen className="size-5 text-cyan" strokeWidth={2.25} aria-hidden />
          <span className="text-lg font-black tracking-tight">FreeRoom</span>
        </div>

        <nav className="flex items-center gap-1.5">
          <Link
            href="/"
            aria-current={active === "grid" ? "page" : undefined}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-black transition-colors sm:px-3.5 ${
              active === "grid"
                ? "glow bg-cyan text-accent-ink"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <LayoutGrid className="size-4" strokeWidth={2.25} aria-hidden />
            <span className="hidden sm:inline">Salles</span>
          </Link>
          <Link
            href="/reservations"
            aria-current={active === "reservations" ? "page" : undefined}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-black transition-colors sm:px-3.5 ${
              active === "reservations"
                ? "glow bg-cyan text-accent-ink"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <CalendarCheck className="size-4" strokeWidth={2.25} aria-hidden />
            <span className="hidden sm:inline">Mes réservations</span>
          </Link>
          {isSuperAdmin && (
            <Link
              href="/admin"
              aria-current={active === "admin" ? "page" : undefined}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-black transition-colors sm:px-3.5 ${
                active === "admin"
                  ? "glow bg-cyan text-accent-ink"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <ShieldCheck className="size-4" strokeWidth={2.25} aria-hidden />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          <span className="hidden items-center gap-1.5 text-sm text-white/70 md:inline-flex">
            {userName}
            {role !== "student" && (
              <span className="rounded-full border border-white/30 px-2 py-0.5 text-[10px] font-black tracking-wide text-white/80 uppercase">
                {role}
              </span>
            )}
          </span>
          <ThemeToggle />
          <form action={logout}>
            <button
              type="submit"
              aria-label="Se déconnecter"
              title="Se déconnecter"
              className="flex size-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-cyan"
            >
              <LogOut className="size-4.5" strokeWidth={2.25} aria-hidden />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
