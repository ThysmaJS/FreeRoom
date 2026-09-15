import Link from "next/link";
import { CalendarCheck, DoorOpen, LayoutGrid, LogOut } from "lucide-react";
import { logout } from "@/lib/actions/auth";

export default function AppHeader({
  userName,
  active,
}: {
  userName: string;
  active: "grid" | "reservations";
}) {
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
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden text-sm text-white/70 md:inline">
            {userName}
          </span>
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
