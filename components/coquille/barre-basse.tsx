"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { destinationsPour, estActive, railInterne } from "./destinations";
import { cn } from "@/lib/fusion-des-classes";

/**
 * Navigation mobile, dans la zone du pouce. Sa hauteur est reprise par
 * `--barre-basse` (`app/styles/tokens/echelle.css`) : un changement ici se
 * reporte là-bas.
 *
 * Le rail de l'administration, trop long, défile plutôt que d'abréger ; sa
 * largeur est un plancher, sinon un long libellé déborde de la pastille active.
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
