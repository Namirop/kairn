"use client";

import { useTranslations } from "next-intl";
import { EXEMPLES_DE_DEPOT } from "@/lib/domain/invites-de-depot";
import { useLangue } from "@/lib/i18n/use-langue";
import { cn } from "@/lib/fusion-des-classes";

/**
 * Tout l'onboarding : le premier dépôt fait le travail. Exemples sans rapport
 * entre eux, pour dire qu'on dépose n'importe quoi ; ils remplissent le champ
 * sans l'envoyer : le dépôt reste le geste de l'utilisateur.
 */
export function ExemplesDeDepot({ onChoisir }: { onChoisir: (texte: string) => void }) {
  const t = useTranslations("depots.formulaire");

  return (
    <div>
      <p className="text-corps text-stone-900">{t("premierDepot")}</p>

      <PucesDExemples onChoisir={onChoisir} className="mt-pas-3" />
    </div>
  );
}

/** Sans introduction : l'app et l'essai public ont chacun la leur. */
export function PucesDExemples({
  onChoisir,
  className,
}: {
  onChoisir: (texte: string) => void;
  className?: string;
}) {
  const langue = useLangue();

  return (
    <ul className={cn("gap-pas-2 flex flex-wrap", className)}>
      {EXEMPLES_DE_DEPOT[langue].map((exemple) => (
        <li key={exemple.etiquette}>
          <button
            type="button"
            onClick={() => onChoisir(exemple.texte)}
            className="rounded-galet px-pas-3 py-pas-2 text-petit hover:border-accent focus-visible:border-accent border border-stone-300 text-stone-500 transition-colors hover:text-stone-900"
          >
            {exemple.etiquette}
          </button>
        </li>
      ))}
    </ul>
  );
}
