import { useTranslations } from "next-intl";
import { Achat } from "@/components/reglages/gestes-de-loffre";
import { PLAFOND_PAYANT } from "@/lib/domain/plafond-du-plan";

/**
 * Ce qu'un compte gratuit peut prendre, et le seul endroit du produit qui le
 * propose depuis l'intérieur.
 *
 * **Il porte la surface de lichen, qui ne servait nulle part ailleurs.** Les
 * quatre surfaces sont déclarées depuis le début et la teintée dormait : elle
 * trouve ici son unique emploi, et c'est ce qui la rend lisible comme un
 * signal plutôt que comme une décoration. Un écran de réglages se tient en
 * neutre — celui-ci n'est pas un réglage, c'est la seule zone du produit
 * authentifié où l'on décide de payer.
 *
 * **Le plafond n'est pas répété dans une phrase.** Il était noyé au milieu de
 * « l'offre complète ouvre 500 concepts par mois, sur la même période que la
 * tienne » : le nombre qu'on vient comparer se lisait en prose, à côté du sien
 * qui, lui, était en chiffres. Les deux se donnent maintenant dans la même
 * forme, à deux centimètres l'un de l'autre.
 *
 * La grille comparative reste sur la page de tarifs. Ici la décision est prise ou
 * elle ne l'est pas ; refaire deux colonnes dans un panneau de réglages
 * redemanderait un arbitrage qu'on ne vient pas rendre.
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
