import { getUser } from "@/lib/dal";
import { logout } from "@/lib/actions/auth";

export default async function Home() {
  const user = await getUser();

  return (
    <div className="flex flex-1 flex-col items-center gap-6 px-4 py-12">
      <div className="flex w-full max-w-2xl items-center justify-between">
        <h1 className="text-xl font-semibold">
          Bonjour {user?.name ?? ""} 👋
        </h1>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-md border border-black/10 px-3 py-1.5 text-sm dark:border-white/15"
          >
            Se déconnecter
          </button>
        </form>
      </div>
      <p className="text-black/60 dark:text-white/60">
        La liste des salles et des créneaux arrive à l&apos;étape suivante.
      </p>
    </div>
  );
}
