"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
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
export function Rail({ administrateur }: { administrateur: boolean }) {
  const chemin = usePathname();
  const t = useTranslations("navigation");

  return (
    <nav
      aria-label={t("principale")}
      /* `data-coquille` dit que ce plan appartient à la coquille et non à la
         page : c'est ce que lit la règle qui l'efface pendant un passage, et
         c'est aussi par là qu'il reçoit son filet — voir `globals.css`. */
      data-coquille="rail"
      /* Les icônes commencent en haut. Le rembourrage valait la hauteur de
         l'en-tête, pour que la première s'aligne sous lui ; mais le rail
         traverse toute la fenêtre et l'en-tête, lui, vit dans la colonne à
         droite. L'alignement se faisait donc avec une ligne qui n'est pas en
         face, au prix de soixante-quatre pixels de rail vides en haut de
         l'écran. */
      className="pt-pas-4 px-pas-2 gap-pas-1 bg-surface-ombre fixed inset-y-0 left-0 z-30 hidden w-28 flex-col items-center md:flex"
    >
      {destinationsPour(chemin, administrateur).map((destination) => {
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
            <span className="text-mono px-pas-2 font-mono tracking-normal">{t(libelle)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
