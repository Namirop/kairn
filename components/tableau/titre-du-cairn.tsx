import { useTranslations } from "next-intl";
import { IndiceTactile, Infobulle } from "@/components/ui/infobulle";

/**
 * L'explication du cairn est sur le titre, où on la cherche ; le nombre, le
 * lecteur d'écran l'a par l'`aria-label` de `Cairn`. `uppercase` est
 * répété : `Infobulle` rend un `<button>`, que les navigateurs mettent en
 * `text-transform: none` sans que la preflight de Tailwind le rétablisse.
 */

/** « Retenu » et non « consolidé » : voir `ETATS_QUI_POSENT_UNE_PIERRE`. */
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
