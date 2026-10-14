import { useTranslations } from "next-intl";
import { IndiceTactile, Infobulle } from "@/components/ui/infobulle";

/**
 * Le titre de la section, qui porte l'explication du cairn : c'est contre le
 * titre qu'on la cherche. Pour le lecteur d'écran, `Cairn` énonce déjà le
 * nombre de pierres par son `aria-label`.
 *
 * `uppercase` est répété sur le déclencheur : `Infobulle` rend un `<button>`,
 * auquel la feuille par défaut des navigateurs impose `text-transform: none`,
 * et la `preflight` de Tailwind ne rétablit pas la casse.
 */

/**
 * « Retenu » et non « consolidé » : le cairn compte deux états, la
 * consolidation que le produit constate et l'archivage que l'utilisateur
 * déclare. Voir `ETATS_QUI_POSENT_UNE_PIERRE`.
 */
export function TitreDuCairn({ retenus }: { retenus: number }) {
  const t = useTranslations("tableau.aujourdhui.cairn");

  return (
    <h2 className="text-mono font-mono tracking-[0.14em] text-stone-300 uppercase">
      <Infobulle
        className="rounded-galet gap-pas-1 inline-flex items-center uppercase"
        contenu={retenus === 0 ? t("legendeVide") : t("legende", { nombre: retenus })}
      >
        {t("titre")}
        <IndiceTactile className="ml-0 text-stone-400" />
      </Infobulle>
    </h2>
  );
}
