import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";
import type { ChargeDuJour } from "@/lib/domain/selection-session";
import { PhraseDuJour, PourquoiCertainsAttendent } from "./phrases-du-compteur";

/**
 * Ce qu'il y a à revoir aujourd'hui. Le chiffre est nu, souligné d'un filet de
 * lichen, et suivi de sa phrase — un nombre sans contexte ne dit rien.
 *
 * Le chiffre affiché est celui de la session, pas celui du retard. Trente-huit
 * décourage sans rien apprendre : la session en servira vingt, et les dix-huit
 * autres reviennent demain sans que rien ne soit perdu. Le total reste dit, sous
 * le compteur, parce que le cacher serait mentir dans l'autre sens.
 *
 * « Arrive à échéance » était du jargon d'algorithme : c'est vrai du point de
 * vue de la carte ts-fsrs, pas de celui de quelqu'un qui ouvre son application
 * le matin.
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
   * Le signal de dette est affiché juste en dessous.
   *
   * Il dit la même chose que « vingt-sept de plus attendent leur tour », en
   * mieux : depuis combien de temps, et quoi y faire. Les deux ensemble, c'était
   * le même nombre annoncé deux fois en quatre lignes.
   */
  detteSignalee: boolean;
}) {
  const { aujourdhui, enAttente } = charge;
  const questionsEnRoute = aDesAtoms && conceptsSansQuestions > 0;
  const t = useTranslations("tableau.aujourdhui");

  return (
    // Sur une colonne, tout se centre. En deux colonnes, tout revient au fer à
    // gauche : le bloc n'est plus seul dans la largeur, il ouvre une rangée, et
    // un texte centré à côté d'une liste alignée à gauche donne deux axes de
    // lecture pour un seul écran. Le point de bascule est celui de la grille.
    <section aria-labelledby="titre-aujourdhui" className="text-center md:text-left">
      <h1
        id="titre-aujourdhui"
        className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase"
      >
        {t("titre")}
      </h1>

      {/* Le nombre est le titre de l'écran, et il se présentait comme une
          statistique. Son échelle est à lui — voir `--t-compteur` —, son poids
          est celui des grands titres du site, et son interlignage se resserre
          sous un : des chiffres n'ont pas de jambage, la boîte d'une ligne
          pleine leur laissait un vide au-dessus et au-dessous qui éloignait
          l'étiquette de ce qu'elle nomme.

          L'étiquette se rapproche d'un cran pour la même raison : elle
          appartient au nombre, le trait et la phrase appartiennent à ce qui
          suit. C'est l'écart qui dit lequel va avec lequel. */}
      <p className="mt-pas-2 font-display text-compteur leading-[0.8] font-bold tabular-nums">
        {aujourdhui}
      </p>
      {/* Le trait grandit avec le nombre : sous des chiffres de dix rems, il
          faisait une miette. */}
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

      {/* Ce qui manque et qui n'est pas un report.

          Six concepts découpés, trois questionnés, une session de trois : l'écran
          ne disait rien, et il n'y avait aucun moyen de comprendre où étaient
          passés les trois autres. Le cas se dit maintenant à côté du compteur,
          qu'il y ait quelque chose à revoir ou non. */}
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
        // Le seul endroit où l'entraînement se propose de lui-même : quand la
        // session n'a rien à donner. Tant qu'il y a quelque chose à revoir,
        // c'est la session qui compte, et deux boutons côte à côte laisseraient
        // croire qu'ils se valent.
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
