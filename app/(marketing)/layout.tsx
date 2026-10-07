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
    <div className="bg-surface-papier flex min-h-dvh flex-col">
      {/* **L'en-tête porte le grain du panneau qu'il coiffe.** Il avait la même
          teinte que le hero et paraissait pourtant plus clair : le grain descend
          sur les panneaux depuis qu'il a quitté la page entière, et l'en-tête,
          qui n'en est pas un, était resté au papier nu. Sur un téléphone, où le
          hero commence à deux centimètres sous la marque, la couture se voyait
          en travers de l'écran. */}
      <header className="entete-du-site grain relative z-20">
        {/* La même mesure que la mesure « page » d'un Panneau, aux mêmes
            gouttières : sur un grand écran, un en-tête plus étroit que ce qu'il
            coiffe posait la marque en retrait du titre qu'elle surplombe, et le
            décalage se voyait avant qu'on sache le nommer.

            **Cinq rems de haut, et tout ce qu'il porte suit d'un quart.** Le
            symbole passe de vingt-quatre à trente pixels — le mot s'aligne
            dessus tout seul, c'est la même mesure qui les gouverne — et le lien
            monte d'un cran sur l'échelle. Grandir la bande sans grandir son
            contenu aurait donné un bandeau vide autour d'objets restés petits.

            La hauteur est recopiée dans la hauteur d'ouverture du hero, qui se
            mesure au pli moins l'en-tête. Les deux se changent ensemble. */}
        <div className="px-pas-6 md:px-pas-8 relative z-10 mx-auto flex h-20 w-full max-w-6xl items-center justify-between 2xl:max-w-[84rem]">
          <Link href={ROUTES.accueil} className="rounded-galet">
            <Marque taille={30} />
          </Link>
          <Link
            href={utilisateur ? ROUTES.aujourdhui : ROUTES.connexion}
            className="text-h2-app rounded-galet px-pas-6 py-pas-3 hover:bg-surface-ombre text-stone-500 transition-colors hover:text-stone-900"
          >
            {utilisateur ? "Aujourd'hui" : "Se connecter"}
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
