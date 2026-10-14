import Link from "next/link";
import { useTranslations } from "next-intl";
import { BlocDetache } from "@/components/coquille/bloc-detache";
import { ROUTES } from "@/lib/auth/routes";
import { PLAFOND_MAX } from "@/lib/domain/selection-session";

/**
 * Quand quelqu'un dépose plus vite qu'il ne révise : un constat, jamais un
 * reproche, toujours avec sa sortie.
 *
 * La sortie est le plafond de session, dans les réglages : une seconde session
 * le jour même ne servirait rien, le plafond journalier étant consommé. Déjà au
 * maximum (`PLAFOND_MAX`), il ne reste qu'à lever le pied, et c'est dit tel quel.
 *
 * En gris de pierre et non en ember, qui appartient à la série seule.
 */
export function SignalDeDette({
  enAttente,
  jours,
  plafond,
}: {
  enAttente: number;
  jours: number;
  /** Le plafond de session du compte : c'est lui qui dit s'il reste une marche à monter. */
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
