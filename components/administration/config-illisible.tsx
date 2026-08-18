import Link from "next/link";
import { ROUTES } from "@/lib/auth/routes";

/**
 * Ce qui s'affiche quand la configuration du modèle est refusée.
 *
 * Le diagnostic est rendu tel quel, en fonte de données : il nomme la variable
 * et montre ce qui a été reçu, et c'est la seule chose qui abrège vraiment la
 * recherche. Le reformuler en prose rassurante coûterait le nom de la variable,
 * c'est-à-dire tout ce qui a de la valeur ici.
 *
 * La couleur est celle des alertes, pas l'accent du produit : cet écran est
 * interne, et `--ember` appartient au streak. Le bloc n'est pas une carte —
 * l'écran est fait de filets, pas de boîtes — mais un aplat tenu par un filet à
 * gauche, qui le pose à côté du contenu sans l'imiter.
 */
export function ConfigIllisible({ motif }: { motif: string }) {
  return (
    <section
      aria-labelledby="config-illisible"
      className="px-pas-4 py-pas-4 border-alerte bg-alerte-surface border-l-2"
    >
      <h2 id="config-illisible" className="text-corps text-alerte font-semibold">
        La configuration du modèle ne se lit pas
      </h2>

      <p className="mt-pas-2 text-petit font-mono break-words text-stone-800">{motif}</p>

      <p className="mt-pas-3 text-petit max-w-prose text-stone-800">
        Tant qu&apos;elle est dans cet état, tout appel au modèle échoue, l&apos;ingestion comprise.
        Elle se corrige dans les variables d&apos;environnement de l&apos;hébergeur, puis au
        redéploiement — un réglage posé ne la rattrape pas, l&apos;environnement est validé avant
        lui.
      </p>

      <p className="mt-pas-2 text-petit">
        <Link href={ROUTES.adminPilotage} className="text-stone-900 underline underline-offset-4">
          Pilotage
        </Link>{" "}
        <span className="text-stone-500">montre ce que le serveur reçoit aujourd&apos;hui.</span>
      </p>
    </section>
  );
}
