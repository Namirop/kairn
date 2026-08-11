import Link from "next/link";
import { ROUTES } from "@/lib/auth/routes";
import type { SessionUser } from "@/lib/auth/session";
import { Marque } from "./marque";

/** Initiales du compte, repère discret plutôt qu'un avatar générique. */
function initiales(nom: string, email: string): string {
  const source = nom.trim() || email;
  const morceaux = source.split(/[\s@._-]+/).filter(Boolean);
  return (morceaux[0]?.[0] ?? "?").concat(morceaux[1]?.[0] ?? "").toUpperCase();
}

export function EnTete({ utilisateur }: { utilisateur: SessionUser }) {
  return (
    <header className="px-pas-4 md:px-pas-8 bg-surface-ombre/85 sticky top-0 z-20 flex h-14 items-center justify-between backdrop-blur-sm md:h-16">
      <Link href={ROUTES.aujourdhui} className="rounded-galet">
        <Marque />
      </Link>
      <Link
        href={ROUTES.reglages}
        className="text-mono bg-surface-papier hover:bg-surface-papier/60 rounded-galet flex size-9 items-center justify-center font-mono tracking-[0.06em] text-stone-500 transition-colors hover:text-stone-900"
        aria-label={`Compte de ${utilisateur.name || utilisateur.email}`}
      >
        {initiales(utilisateur.name, utilisateur.email)}
      </Link>
    </header>
  );
}
