import Link from "next/link";
import { Marque } from "@/components/coquille/marque";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * La coquille publique.
 *
 * Elle ne pose aucune mesure : chaque panneau porte la sienne, et le fond va
 * d'un bord à l'autre. Un conteneur ici rendrait toutes les surfaces
 * impossibles.
 *
 * Elle sait qui est là. Une page publique qui propose « Se connecter » à
 * quelqu'un de connecté lui dit qu'il ne l'est pas : il repart chercher un lien
 * dans sa boîte, et c'est le produit qui a l'air cassé. Le prix est que les
 * pages légales cessent d'être statiques — elles lisent une session comme le
 * reste de la coquille.
 */
export default async function CoquilleSite({ children }: { children: React.ReactNode }) {
  const utilisateur = await getCurrentUser();

  return (
    <div className="bg-surface-papier min-h-dvh">
      <header className="bg-surface-papier relative z-20">
        {/* La même mesure que la mesure « page » d'un Panneau, aux mêmes
            gouttières : sur un grand écran, un en-tête plus étroit que ce qu'il
            coiffe posait la marque en retrait du titre qu'elle surplombe, et le
            décalage se voyait avant qu'on sache le nommer. */}
        <div className="px-pas-4 md:px-pas-8 mx-auto flex h-16 w-full max-w-6xl items-center justify-between 2xl:max-w-[84rem]">
          <Link href={ROUTES.accueil} className="rounded-galet">
            <Marque />
          </Link>
          <Link
            href={utilisateur ? ROUTES.aujourdhui : ROUTES.connexion}
            className="text-corps rounded-galet px-pas-4 py-pas-2 hover:bg-surface-ombre text-stone-500 transition-colors hover:text-stone-900"
          >
            {utilisateur ? "Aujourd'hui" : "Se connecter"}
          </Link>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
