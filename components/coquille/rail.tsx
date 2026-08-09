"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DESTINATIONS } from "./destinations";
import { cn } from "@/lib/utils";

/**
 * Navigation de bureau : un rail vertical étroit, icône et libellé visibles.
 * L'indicateur d'état actif est un trait de lichen à gauche — c'est le seul
 * endroit de la coquille où l'accent apparaît.
 */
export function Rail() {
  const chemin = usePathname();

  return (
    <nav
      aria-label="Navigation principale"
      className="pt-pas-16 fixed inset-y-0 left-0 z-30 hidden w-22 flex-col items-center border-r border-stone-100 bg-stone-50 md:flex"
    >
      {DESTINATIONS.map(({ href, libelle, icone: Icone }) => {
        const actif = chemin === href || chemin.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            aria-current={actif ? "page" : undefined}
            className={cn(
              "gap-pas-1 py-pas-3 relative flex w-full flex-col items-center transition-colors",
              actif ? "text-stone-900" : "text-stone-500 hover:text-stone-900",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "top-pas-2 bottom-pas-2 absolute left-0 w-0.5 transition-colors",
                actif ? "bg-lichen" : "bg-transparent",
              )}
            />
            <Icone className="size-5" strokeWidth={1.75} aria-hidden />
            <span className="text-mono font-mono tracking-[0.06em]">{libelle}</span>
          </Link>
        );
      })}
    </nav>
  );
}
