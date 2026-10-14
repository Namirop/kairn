import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";
import type { ChargeDuJour } from "@/lib/domain/selection-session";
import { PhraseDuJour, PourquoiCertainsAttendent } from "./phrases-du-compteur";

/**
 * Ce qu'il y a à revoir aujourd'hui : le chiffre, souligné d'un filet d'accent,
 * puis sa phrase.
 *
 * Le chiffre est celui de la session, pas celui du retard : un retard de 38
 * décourage quand la session en servira 20, et le reste revient demain sans
 * perte. Le total reste dit sous le compteur, le cacher serait mentir.
 *
 * Ses phrases à zéro et en attente vivent dans `phrases-du-compteur.tsx`.
 */
export function CompteurDu({
  charge,
  aDesAtoms,
  conceptsSansQuestions,
  plafond,
  faitsAujourdhui,
  detteSignalee,
}: {
  charge: ChargeDuJour;
  aDesAtoms: boolean;
  /** Combien de concepts n'ont pas encore une seule question écrite. */
  conceptsSansQuestions: number;
  /** Le plafond de session du compte, et ce qu'il en reste consommé aujourd'hui. */
  plafond: number;
  faitsAujourdhui: number;
  /**
   * Le signal de dette est affiché juste en dessous : il dit déjà ce qui attend,
   * en mieux, et la phrase d'attente ferait doublon.
   */
  detteSignalee: boolean;
}) {
  const { aujourdhui, enAttente } = charge;
  const questionsEnRoute = aDesAtoms && conceptsSansQuestions > 0;
  const t = useTranslations("tableau.aujourdhui");

  return (
    // Centré sur une colonne, au fer à gauche en deux colonnes (un seul axe de
    // lecture par écran). Le point de bascule est celui de la grille.
    <section aria-labelledby="titre-aujourdhui" className="text-center md:text-left">
      <h1
        id="titre-aujourdhui"
        className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase"
      >
        {t("titre")}
      </h1>

      {/* Interlignage sous un : des chiffres n'ont pas de jambage, et une ligne
          pleine éloignerait l'étiquette du nombre qu'elle nomme. Échelle :
          `--t-compteur`. */}
      <p className="mt-pas-2 font-display text-compteur leading-[0.8] font-bold tabular-nums">
        {aujourdhui}
      </p>
      <span aria-hidden className="mt-pas-4 bg-accent mx-auto block h-1 w-20 md:mx-0 md:w-28" />

      <p className="mt-pas-4 mx-auto text-stone-500 md:mx-0">
        {aujourdhui === 0 ? (
          <PhraseDuJour
            aDesAtoms={aDesAtoms}
            questionsEnRoute={questionsEnRoute}
            faitsAujourdhui={faitsAujourdhui}
          />
        ) : (
          t("compteur.aRevoir", { nombre: aujourdhui })
        )}
      </p>

      {enAttente > 0 && !detteSignalee ? (
        <p className="mt-pas-2 text-petit mx-auto text-stone-500 md:mx-0">
          <PourquoiCertainsAttendent enAttente={enAttente} plafond={plafond} />
        </p>
      ) : null}

      {/* Des concepts encore sans question : sans cette phrase, ils
          manqueraient à la session sans explication. */}
      {questionsEnRoute && aujourdhui > 0 ? (
        <p className="mt-pas-2 text-petit mx-auto text-stone-500 md:mx-0">
          {t("compteur.sansQuestions", { nombre: conceptsSansQuestions })}
        </p>
      ) : null}

      {aujourdhui > 0 ? (
        <Button asChild size="lg" className="mt-pas-6 w-full md:w-auto">
          <Link href={ROUTES.reviser}>{t("compteur.commencer")}</Link>
        </Button>
      ) : aDesAtoms && !questionsEnRoute ? (
        // L'entraînement ne se propose que quand la session n'a rien à donner :
        // côte à côte, les deux boutons auraient l'air de se valoir.
        <div className="mt-pas-6 flex flex-col items-center md:items-start">
          <Button asChild size="lg" variant="outline" className="w-full md:w-fit">
            <Link href={ROUTES.entrainement}>{t("compteur.entrainer")}</Link>
          </Button>
          <span className="mt-pas-2 text-petit text-stone-500">{t("compteur.entrainerAide")}</span>
        </div>
      ) : aDesAtoms ? null : (
        // Rien déposé : le geste qui manque est le dépôt, pas la révision.
        <Button asChild size="lg" className="mt-pas-6 w-full md:w-auto">
          <Link href={`${ROUTES.depots}/nouveau`}>{t("compteur.deposer")}</Link>
        </Button>
      )}
    </section>
  );
}
