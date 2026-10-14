"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CARACTERES_MAXIMUM_ANONYME } from "@/lib/depots/bornes-du-depot";
import { ETIQUETTE_INTL } from "@/lib/i18n/langues";
import { useLangue } from "@/lib/i18n/use-langue";

/** Au-delà, on montre le compteur. Trois quarts, comme dans le formulaire du produit. */
const SEUIL_COMPTEUR = Math.floor(CARACTERES_MAXIMUM_ANONYME * 0.75);

/**
 * Le bouton, sa mention, et ce que le dépôt a à dire.
 *
 * Bouton et mention restent sur une ligne, sans `flex-wrap` : sur téléphone,
 * c'est la mention qui se plie, plutôt que de passer dessous comme un bloc.
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

        {/* À l'approche de la borne, le compteur remplace la mention rassurante :
            c'est lui qui dit pourquoi le bouton refuse. */}
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

      {/* Pas de place réservée : sous le bouton, le message ne décale que ce qui
          suit. La balise reste montée pour que la région `aria-live` annonce ;
          `empty:` retire seulement sa marge. */}
      <p className="text-petit mt-pas-2 empty:mt-0" role="status" aria-live="polite">
        {erreur ? <span className="text-alerte">{erreur}</span> : null}
        {!erreur && reprise ? <span className="text-stone-500">{t("reprise")}</span> : null}
      </p>
    </div>
  );
}
