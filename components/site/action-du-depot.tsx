"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CARACTERES_MAXIMUM_ANONYME } from "@/lib/depots/bornes-du-depot";
import { ETIQUETTE_INTL } from "@/lib/i18n/langues";
import { useLangue } from "@/lib/i18n/use-langue";

/** Seuil du compteur : trois quarts, comme dans le formulaire du produit. */
const SEUIL_COMPTEUR = Math.floor(CARACTERES_MAXIMUM_ANONYME * 0.75);

/**
 * Le bouton, sa mention, et ce que le dépôt a à dire. Sans `flex-wrap` : sur
 * téléphone, la mention se plie au lieu de passer dessous.
 */
export function ActionDuDepot({
  enCours,
  trop,
  longueur,
  erreur,
  reprise,
}: {
  enCours: boolean;
  trop: boolean;
  longueur: number;
  erreur?: string;
  reprise: boolean;
}) {
  const t = useTranslations("site.essai.action");
  const etiquette = ETIQUETTE_INTL[useLangue()];

  return (
    <div>
      <div className="gap-pas-3 md:gap-pas-4 flex items-center">
        <Button
          type="submit"
          size="lg"
          className="px-pas-4 text-petit md:px-pas-8 md:text-corps"
          disabled={enCours || trop}
        >
          {enCours ? t("enCours") : t("envoyer")}
        </Button>

        {/* Près de la borne, le compteur dit pourquoi le bouton refuse. */}
        {longueur > SEUIL_COMPTEUR ? (
          <span
            className={`text-mono min-w-0 font-mono tabular-nums ${trop ? "text-alerte" : "text-stone-500"}`}
          >
            {longueur.toLocaleString(etiquette)} /{" "}
            {CARACTERES_MAXIMUM_ANONYME.toLocaleString(etiquette)}
          </span>
        ) : (
          <span className="text-petit min-w-0 text-stone-500">{t("rassurance")}</span>
        )}
      </div>

      {/* Toujours montée pour que `aria-live` annonce ; `empty:` retire sa marge. */}
      <p className="text-petit mt-pas-2 empty:mt-0" role="status" aria-live="polite">
        {erreur ? <span className="text-alerte">{erreur}</span> : null}
        {!erreur && reprise ? <span className="text-stone-500">{t("reprise")}</span> : null}
      </p>
    </div>
  );
}
