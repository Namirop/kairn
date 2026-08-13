"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { destinationsPour, estActive } from "./destinations";
import { cn } from "@/lib/utils";

/**
 * Navigation de bureau : un rail vertical étroit, icône et libellé visibles.
 *
 * Le rail est une surface d'ombre, la page une surface de papier : la
 * séparation vient du fond, pas d'un trait. La destination active porte la
 * surface de la page — elle appartient à ce qu'on est en train de regarder,
 * et c'est ce que dit sa pastille claire.
 *
 * L'accent a quitté la navigation. Il signale ce qui est dû et le sommet du
 * cairn ; un état de navigation se lit très bien sans lui, et chaque
 * occurrence de lichen en moins rend les autres plus fortes.
 */
export function Rail() {
  const chemin = usePathname();

  return (
    <nav
      aria-label="Navigation principale"
      className="pt-pas-16 px-pas-2 gap-pas-1 bg-surface-ombre fixed inset-y-0 left-0 z-30 hidden w-28 flex-col items-center md:flex"
    >
      {destinationsPour(chemin).map((destination) => {
        const { href, libelle, icone: Icone } = destination;
        const actif = estActive(destination, chemin);

        return (
          <Link
            key={href}
            href={href}
            aria-current={actif ? "page" : undefined}
            className={cn(
              "gap-pas-1 py-pas-3 rounded-carte flex w-full flex-col items-center transition-colors",
              actif
                ? "bg-surface-papier text-stone-900"
                : "hover:bg-surface-papier/60 text-stone-500 hover:text-stone-900",
            )}
          >
            <Icone className="size-5" strokeWidth={1.75} aria-hidden />
            {/* Le libellé tient sur une ligne, sans toucher les bords : c'est
                « Aujourd'hui » qui commande la largeur du rail. */}
            <span className="text-mono px-pas-2 font-mono tracking-normal">{libelle}</span>
          </Link>
        );
      })}
    </nav>
  );
}
