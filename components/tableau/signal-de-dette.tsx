import Link from "next/link";
import { useTranslations } from "next-intl";
import { BlocDetache } from "@/components/coquille/bloc-detache";
import { ROUTES } from "@/lib/auth/routes";
import { PLAFOND_MAX } from "@/lib/domain/selection-session";

/**
 * Un constat, jamais un reproche, avec sa sortie : le plafond de session, une
 * seconde session le jour même ne servant à rien. Au `PLAFOND_MAX`, il ne reste
 * qu'à lever le pied. Pas d'ember : il appartient à la série.
 */
export function SignalDeDette({
  enAttente,
  jours,
  plafond,
}: {
  enAttente: number;
  jours: number;
  /** Celui du compte : dit s'il reste une marche à monter. */
  plafond: number;
}) {
  const t = useTranslations("tableau.aujourdhui.dette");

  return (
    <BlocDetache>
      <p className="text-corps max-w-prose leading-relaxed text-stone-900">
        {t("constat", { jours, enAttente })}
      </p>
      <p className="mt-pas-2 text-petit max-w-prose text-stone-500">
        {plafond >= PLAFOND_MAX
          ? t("auMaximum", { plafond })
          : t.rich("deuxFacons", {
              plafond,
              lien: (morceau) => (
                <Link
                  href={ROUTES.reglages}
                  className="rounded-galet text-stone-800 underline underline-offset-4"
                >
                  {morceau}
                </Link>
              ),
            })}
      </p>
    </BlocDetache>
  );
}
