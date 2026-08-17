import { PileDeSession } from "@/components/revision/pile-de-session";
import type { ProchainRappel } from "@/lib/domain/prochain-rappel";

/**
 * Où en est la session du jour.
 *
 * Trois choses, et pas une quatrième : la série en cours, le chemin parcouru, et
 * quand le prochain rappel tombera. Aucune n'est un score — la série est un fait
 * de calendrier, le chemin se lit en pierres, le rappel est une heure.
 *
 * La série est la seule occurrence de l'ember de tout l'écran, et c'est la règle
 * du produit : cet accent ne sert qu'à elle. Le rappel n'apparaît que s'il est
 * réglé — annoncer une heure à quelqu'un qui a coupé ses emails serait un
 * mensonge poli.
 *
 * En colonne, les trois blocs se répartissent sur la hauteur et la pile se
 * retrouve au milieu ; en bande, ils s'alignent et le dernier passe à la ligne.
 * C'est la seule différence entre les deux formats.
 */

/** L'intitulé d'un bloc : mono, très petit, espacé, sur la roche. */
const ETIQUETTE = "text-mono font-mono tracking-[0.14em] text-stone-400 uppercase";

/** L'heure du rappel, dans le calendrier de la personne et non en UTC. */
function quandLeRappelTombe({ jour, heure }: ProchainRappel): string {
  return `${jour === "aujourdhui" ? "aujourd'hui" : "demain"}, ${heure} h`;
}

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
  return (
    <div className="px-pas-4 py-pas-4 md:px-pas-8 lg:px-pas-6 lg:py-pas-8 gap-pas-3 lg:gap-pas-6 flex h-full flex-wrap items-center justify-between lg:flex-col lg:flex-nowrap lg:justify-between lg:text-center">
      <div className="order-2 lg:order-1">
        <p className={`${ETIQUETTE} hidden lg:block`}>Aujourd&apos;hui</p>

        {serie > 0 ? (
          <p className="text-mono border-ember-clair/40 text-ember-clair rounded-galet px-pas-2 lg:mt-pas-3 inline-block border py-0.5 font-mono tracking-[0.12em] uppercase">
            <span className="tabular-nums">{serie}</span> {serie === 1 ? "jour" : "jours"}{" "}
            d&apos;affilée
          </p>
        ) : null}
      </div>

      <div className="gap-pas-3 order-1 flex items-center lg:order-2 lg:flex-col">
        {/* La pile demande de la hauteur pour rester un empilement : en bande,
            sept pierres tiendraient dans soixante pixels et ne seraient plus
            qu'une texture. Le compte dit la même chose en une ligne, et c'est
            lui qui reste quand il n'y a pas la place. */}
        <div className="hidden lg:block">
          <PileDeSession rang={faites} total={total} clair />
        </div>

        <p className={`${ETIQUETTE} leading-tight`}>
          <span className="text-petit text-stone-50 tabular-nums">
            {faites} / {total}
          </span>
          <span className="lg:mt-pas-1 lg:block"> concepts</span>
        </p>
      </div>

      {rappel ? (
        <p className="order-3 w-full lg:w-auto">
          <span className={ETIQUETTE}>Prochain rappel</span>{" "}
          <span className="text-mono lg:mt-pas-1 font-mono text-stone-300 lg:block">
            {quandLeRappelTombe(rappel)}
          </span>
        </p>
      ) : null}
    </div>
  );
}
