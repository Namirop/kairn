"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DESTINATIONS } from "./destinations";
import { cn } from "@/lib/utils";

/**
 * Navigation mobile : une barre basse, dans la zone du pouce. Ce n'est pas le
 * rail comprimé — les cibles font 56 px de haut sur toute la largeur disponible,
 * et l'état actif se lit à un trait de lichen posé sous l'icône.
 *
 * Le rembourrage bas suit l'encoche gestuelle plutôt qu'une constante.
 */
export function BarreBasse() {
  const chemin = usePathname();

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-100 bg-stone-50 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex">
        {DESTINATIONS.map(({ href, libelle, icone: Icone }) => {
          const actif = chemin === href || chemin.startsWith(`${href}/`);

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={actif ? "page" : undefined}
                className={cn(
                  "gap-pas-1 flex h-14 flex-col items-center justify-center transition-colors",
                  actif ? "text-stone-900" : "text-stone-500",
                )}
              >
                <Icone className="size-5" strokeWidth={1.75} aria-hidden />
                <span className="text-mono font-mono tracking-[0.06em]">{libelle}</span>
                <span
                  aria-hidden
                  className={cn("h-0.5 w-6", actif ? "bg-lichen" : "bg-transparent")}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
