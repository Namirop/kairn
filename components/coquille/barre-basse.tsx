"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { destinationsPour, estActive, railInterne } from "./destinations";
import { cn } from "@/lib/utils";

/**
 * Navigation mobile : une barre basse, dans la zone du pouce. Ce n'est pas le
 * rail comprimé — les cibles font 56 px de haut sur toute la largeur
 * disponible, et l'état actif se lit à la pastille claire posée sous
 * l'icône : la destination active porte la surface de la page.
 *
 * Le rembourrage bas suit l'encoche gestuelle plutôt qu'une constante.
 *
 * Sa hauteur totale est reprise par `--barre-basse` dans `globals.css` : ce qui
 * doit se poser au-dessus d'elle s'y réfère. Une cible ou un rembourrage qui
 * change ici se reporte là-bas.
 *
 * L'administration en compte sept, et sept parts égales sur trois cent
 * soixante-quinze pixels ne laissent pas la place d'écrire « Signalements ». Ses
 * onglets défilent donc, plutôt que d'abréger des mots qui sont le vocabulaire
 * du produit. Le défilement est acceptable là où il ne l'est pas dans le
 * produit : cet écran a un seul lecteur, qui connaît ses sections.
 *
 * Leur largeur est un **plancher**, pas une mesure. Fixée, elle donnait la même
 * boîte à « Contenu » et à « Signalements » : le second débordait de sa pastille
 * des deux côtés, et l'état actif — qui est justement cette pastille — cessait
 * de désigner l'onglet qu'il colorait. Un onglet qui défile n'a aucune raison
 * d'être plus étroit que son mot.
 */
export function BarreBasse({ administrateur }: { administrateur: boolean }) {
  const chemin = usePathname();
  const t = useTranslations("navigation");
  const interne = railInterne(chemin, administrateur);

  return (
    <nav
      aria-label={t("principale")}
      className="bg-surface-ombre p-pas-2 fixed inset-x-0 bottom-0 z-30 pb-[calc(env(safe-area-inset-bottom)+var(--pas-2))] md:hidden"
    >
      <ul className={cn("gap-pas-1 flex", interne && "overflow-x-auto")}>
        {destinationsPour(chemin, administrateur).map((destination) => {
          const { href, libelle, icone: Icone } = destination;
          const actif = estActive(destination, chemin);

          return (
            <li key={href} className={cn(interne ? "min-w-20 shrink-0" : "min-w-0 flex-1")}>
              <Link
                href={href}
                aria-current={actif ? "page" : undefined}
                className={cn(
                  "gap-pas-1 px-pas-2 rounded-carte flex h-14 flex-col items-center justify-center transition-colors",
                  actif ? "bg-surface-papier text-stone-900" : "text-stone-500",
                )}
              >
                <Icone className="size-5" strokeWidth={1.75} aria-hidden />
                <span className="text-mono font-mono tracking-normal whitespace-nowrap">
                  {t(libelle)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
