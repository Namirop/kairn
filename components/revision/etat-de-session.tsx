import { useTranslations } from "next-intl";
import { heureLue } from "@/components/revision/heure-lue";
import { PileDeSession } from "@/components/revision/pile-de-session";
import type { ProchainRappel } from "@/lib/domain/prochain-rappel";
import { useLangue } from "@/lib/i18n/use-langue";

/**
 * Où en est la session du jour : la série, le chemin parcouru, le prochain
 * rappel (seulement s'il est réglé). En colonne sur grand écran, en bande
 * au-dessus.
 *
 * Sur téléphone, le rappel est masqué pour que la bande, qui suit le
 * défilement, tienne sur une ligne : il se lit au tableau de bord.
 */

/** L'intitulé d'un bloc : mono, très petit, espacé, sur la roche. */
const ETIQUETTE = "text-mono font-mono tracking-[0.14em] text-stone-400 uppercase";

export function EtatDeSession({
  faites,
  total,
  serie,
  rappel,
}: {
  /** Combien de concepts sont passés. */
  faites: number;
  total: number;
  serie: number;
  /** Quand tombe le prochain rappel quotidien. Nul quand il est coupé. */
  rappel: ProchainRappel | null;
}) {
  const t = useTranslations("revision.session.etat");
  const langue = useLangue();

  return (
    <div className="px-pas-4 py-pas-3 md:px-pas-8 md:py-pas-4 lg:px-pas-6 lg:py-pas-8 gap-pas-3 lg:gap-pas-6 flex h-full flex-wrap items-center justify-between lg:flex-col lg:flex-nowrap lg:justify-between lg:text-center">
      <div className="order-2 lg:order-1">
        <p className={`${ETIQUETTE} hidden lg:block`}>{t("aujourdhui")}</p>

        {serie > 0 ? (
          <p className="text-mono border-ember-clair/40 text-ember-clair rounded-galet px-pas-2 lg:mt-pas-3 inline-block border py-0.5 font-mono tracking-[0.12em] uppercase">
            <span className="tabular-nums">{serie}</span> {t("serie", { serie })}
          </p>
        ) : null}
      </div>

      <div className="gap-pas-3 order-1 flex items-center lg:order-2 lg:flex-col">
        {/* La pile n'existe qu'en colonne : en bande, elle tiendrait dans 60 px
            et ne se lirait plus. Le compte reste partout. */}
        <div className="hidden lg:block">
          <PileDeSession rang={faites} total={total} clair />
        </div>

        <p className={`${ETIQUETTE} leading-tight`}>
          <span className="text-petit text-stone-50 tabular-nums">
            {faites} / {total}
          </span>
          <span className="lg:mt-pas-1 lg:block"> {t("concepts")}</span>
        </p>
      </div>

      {rappel ? (
        <p className="order-3 w-full max-sm:hidden lg:w-auto">
          <span className={ETIQUETTE}>{t("prochainRappel")}</span>{" "}
          <span className="text-mono lg:mt-pas-1 font-mono text-stone-300 lg:block">
            {/* L'heure du rappel, dans le calendrier de la personne et non en UTC. */}
            {t("quandLeRappelTombe", {
              jour: rappel.jour,
              heure: rappel.heure,
              heureLue: heureLue(rappel.heure, langue),
            })}
          </span>
        </p>
      ) : null}
    </div>
  );
}
