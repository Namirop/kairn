"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DESTINATIONS } from "./destinations";
import { cn } from "@/lib/utils";

/**
 * Navigation mobile : une barre basse, dans la zone du pouce. Ce n'est pas le
 * rail comprimé — les cibles font 56 px de haut sur toute la largeur
 * disponible, et l'état actif se lit à la pastille claire posée sous
 * l'icône : la destination active porte la surface de la page.
 *
 * Le rembourrage bas suit l'encoche gestuelle plutôt qu'une constante.
 */
export function BarreBasse() {
  const chemin = usePathname();

  return (
    <nav
      aria-label="Navigation principale"
      className="bg-surface-ombre p-pas-2 fixed inset-x-0 bottom-0 z-30 pb-[calc(env(safe-area-inset-bottom)+var(--pas-2))] md:hidden"
    >
      <ul className="gap-pas-1 flex">
        {DESTINATIONS.map(({ href, libelle, icone: Icone }) => {
          const actif = chemin === href || chemin.startsWith(`${href}/`);

          return (
            <li key={href} className="flex-1">
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
