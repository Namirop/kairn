"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { destinationsPour, estActive } from "./destinations";
import { cn } from "@/lib/fusion-des-classes";

/** La destination active porte la surface de la page qu'elle désigne. */
export function Rail({ administrateur }: { administrateur: boolean }) {
  const chemin = usePathname();
  const t = useTranslations("navigation");

  return (
    <nav
      aria-label={t("principale")}
      /* Lu par `app/styles/coquille.css` : effacé pendant un passage, filet. */
      data-coquille="rail"
      /* Pas aligné sur l'en-tête, qui vit dans la colonne de droite. */
      className="pt-pas-4 px-pas-2 gap-pas-1 bg-surface-ombre w-rail fixed inset-y-0 left-0 z-30 hidden flex-col items-center md:flex"
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
            {/* « Aujourd'hui » commande la largeur du rail. */}
            <span className="text-mono px-pas-2 font-mono tracking-normal">{t(libelle)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
