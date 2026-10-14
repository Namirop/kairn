import { useTranslations } from "next-intl";
import { Achat } from "@/components/reglages/gestes-de-loffre";
import { PLAFOND_PAYANT } from "@/lib/domain/plafond-du-plan";

/**
 * Ce qu'un compte gratuit peut prendre : le seul endroit du produit authentifié
 * qui propose de payer.
 *
 * Il porte la surface `lichen`, qui n'a pas d'autre emploi : c'est ce qui la
 * fait lire comme un signal. Le plafond est donné dans la même forme que celui
 * de l'offre en cours, pour se comparer d'un coup d'œil.
 */
export function OffreComplete() {
  const t = useTranslations("compte.offre");

  return (
    <div className="p-pas-4 md:p-pas-6 rounded-champ bg-surface-lichen mt-pas-3">
      <div className="gap-pas-3 flex flex-wrap items-baseline justify-between">
        <p className="text-corps font-semibold text-stone-900">{t("complete.titre")}</p>
        <p className="text-petit font-mono text-stone-700 tabular-nums">
          {t("parMois", { plafond: PLAFOND_PAYANT })}
        </p>
      </div>

      <p className="mt-pas-2 text-petit max-w-prose text-stone-500">{t("complete.texte")}</p>

      <div className="mt-pas-4">
        <Achat ouvert />
      </div>
    </div>
  );
}
