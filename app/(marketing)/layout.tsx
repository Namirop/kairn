import Link from "next/link";
import { Marque } from "@/components/coquille/marque";
import { ROUTES } from "@/lib/auth/routes";

/**
 * La coquille publique.
 *
 * Elle ne pose aucune mesure : chaque panneau porte la sienne, et le fond va
 * d'un bord à l'autre. Un conteneur ici rendrait toutes les surfaces
 * impossibles.
 */
export default function CoquilleSite({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface-papier min-h-dvh">
      <header className="bg-surface-papier relative z-20">
        <div className="px-pas-4 md:px-pas-8 mx-auto flex h-16 w-full max-w-5xl items-center justify-between">
          <Link href={ROUTES.accueil} className="rounded-galet">
            <Marque />
          </Link>
          <Link
            href={ROUTES.connexion}
            className="text-petit rounded-galet px-pas-4 py-pas-2 hover:bg-surface-ombre text-stone-500 transition-colors hover:text-stone-900"
          >
            Se connecter
          </Link>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
