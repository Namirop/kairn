"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dansLAdministration, destinationsPour, estActive } from "./destinations";
import { cn } from "@/lib/utils";

/**
 * Navigation mobile : une barre basse, dans la zone du pouce. Ce n'est pas le
 * rail comprimé — les cibles font 56 px de haut sur toute la largeur
 * disponible, et l'état actif se lit à la pastille claire posée sous
 * l'icône : la destination active porte la surface de la page.
 *
 * Le rembourrage bas suit l'encoche gestuelle plutôt qu'une constante.
 *
 * L'administration en compte sept, et sept parts égales sur trois cent
 * soixante-quinze pixels ne laissent pas la place d'écrire « Signalements ». Ses
 * onglets gardent donc une largeur fixe et la barre défile, plutôt que d'abréger
 * des mots qui sont le vocabulaire du produit. Le défilement est acceptable là
 * où il ne l'est pas dans le produit : cet écran a un seul lecteur, qui connaît
 * ses sections.
 */
export function BarreBasse() {
  const chemin = usePathname();
  const interne = dansLAdministration(chemin);

  return (
    <nav
      aria-label="Navigation principale"
      className="bg-surface-ombre p-pas-2 fixed inset-x-0 bottom-0 z-30 pb-[calc(env(safe-area-inset-bottom)+var(--pas-2))] md:hidden"
    >
      <ul className={cn("gap-pas-1 flex", interne && "overflow-x-auto")}>
        {destinationsPour(chemin).map((destination) => {
          const { href, libelle, icone: Icone } = destination;
          const actif = estActive(destination, chemin);

          return (
            <li key={href} className={cn(interne ? "w-20 shrink-0" : "flex-1")}>
              <Link
                href={href}
                aria-current={actif ? "page" : undefined}
                className={cn(
                  "gap-pas-1 rounded-carte flex h-14 flex-col items-center justify-center transition-colors",
                  actif ? "bg-surface-papier text-stone-900" : "text-stone-500",
                )}
              >
                <Icone className="size-5" strokeWidth={1.75} aria-hidden />
                <span className="text-mono font-mono tracking-normal">{libelle}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
