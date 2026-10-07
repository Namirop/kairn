import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";
import { compte } from "@/lib/domain/accord";
import { PLAFOND_SESSION, type ChargeDuJour } from "@/lib/domain/selection-session";

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
 */

/**
 * La phrase du compteur, quand il est à zéro.
 *
 * **Quatre zéros, pas un.** Rien n'a jamais été déposé ; les concepts sont là
 * mais leurs questions s'écrivent ; la journée est faite ; ou il n'y a
 * simplement rien à revoir. Les trois premiers se disaient déjà ; le troisième,
 * non — et c'est le seul qui se lisait faux.
 *
 * **« Les prochains concepts reviendront d'eux-mêmes » était un mensonge une
 * fois sur deux.** Cette phrase s'affichait aussi quand vingt-sept concepts
 * attendaient derrière un plafond atteint : ils ne revenaient pas d'eux-mêmes,
 * ils étaient au bout d'une file. Un écran qui annonce le calme au-dessus d'un
 * paragraphe qui annonce l'attente n'est pas seulement fouillis, il est faux.
 *
 * La journée faite se reconnaît à ce qu'on a revu quelque chose : le plafond est
 * journalier, donc un compteur à zéro derrière des passages faits ne veut dire
 * qu'une chose.
 */
function PhraseDuJour({
  aDesAtoms,
  questionsEnRoute,
  faitsAujourdhui,
}: {
  aDesAtoms: boolean;
  questionsEnRoute: boolean;
  faitsAujourdhui: number;
}) {
  if (!aDesAtoms) return <>Rien à revoir tant que tu n&apos;as rien déposé.</>;

  if (questionsEnRoute) {
    return <>Tes concepts sont là, leurs questions s&apos;écrivent. Reviens dans un moment.</>;
  }

  if (faitsAujourdhui > 0) {
    return (
      <>
        Ta journée est faite : {compte(faitsAujourdhui, "concept revu", "concepts revus")}, le
        maximum d&apos;une journée.
      </>
    );
  }

  return <>Rien à revoir aujourd&apos;hui. Les prochains concepts reviendront d&apos;eux-mêmes.</>;
}

/**
 * Pourquoi des concepts dus ne seront pas servis aujourd'hui.
 *
 * L'écran disait « une session s'arrête à vingt », en toutes lettres, et c'était
 * faux deux fois. Faux sur le nombre — le plafond se règle, et quelqu'un qui l'a
 * mis à dix lisait vingt. Faux sur la raison — on peut être arrêté à deux parce
 * qu'on en a déjà revu dix-huit, et « une session s'arrête à vingt » sous un
 * compteur affichant deux ne s'explique pas tout seul.
 *
 * **Il ne parle plus de la journée entamée.** C'est maintenant la phrase du
 * compteur qui le dit, et le redire ici faisait lire deux fois le même fait à
 * trois lignes d'écart — la moitié du fouillis de cet écran tenait là.
 */
function PourquoiCertainsAttendent({ enAttente, plafond }: { enAttente: number; plafond: number }) {
  return (
    <>
      {enAttente} de plus {enAttente === 1 ? "attend son tour" : "attendent leur tour"}.{" "}
      {plafond === PLAFOND_SESSION ? (
        <>
          Une session s&apos;arrête à {plafond} concepts, <Lien>et ça se règle</Lien>.
        </>
      ) : (
        <>
          Tu as réglé ta session à {plafond} concepts, <Lien>et ça se rechange</Lien>.
        </>
      )}{" "}
      Le reste revient demain, en commençant par ce qui risque le plus.
    </>
  );
}

function Lien({ children }: { children: React.ReactNode }) {
  return (
    <Link
      href={ROUTES.reglages}
      className="rounded-galet underline-offset-4 hover:text-stone-900 hover:underline focus-visible:underline"
    >
      {children}
    </Link>
  );
}

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
        Aujourd&apos;hui
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
          `${aujourdhui === 1 ? "concept à revoir" : "concepts à revoir"} aujourd'hui.`
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
          {compte(conceptsSansQuestions, "concept attend", "concepts attendent")} encore leurs
          questions. Elles s&apos;écrivent, ils rejoindront la session d&apos;eux-mêmes.
        </p>
      ) : null}

      {aujourdhui > 0 ? (
        <Button asChild size="lg" className="mt-pas-6 w-full md:w-auto">
          <Link href={ROUTES.reviser}>Commencer</Link>
        </Button>
      ) : aDesAtoms && !questionsEnRoute ? (
        // Le seul endroit où l'entraînement se propose de lui-même : quand la
        // session n'a rien à donner. Tant qu'il y a quelque chose à revoir,
        // c'est la session qui compte, et deux boutons côte à côte laisseraient
        // croire qu'ils se valent.
        <div className="mt-pas-6 flex flex-col items-center md:items-start">
          <Button asChild size="lg" variant="outline" className="w-full md:w-fit">
            <Link href={ROUTES.entrainement}>S&apos;entraîner</Link>
          </Button>
          <span className="mt-pas-2 text-petit text-stone-500">
            D&apos;autres questions sur les mêmes concepts. Ça ne change pas ton planning.
          </span>
        </div>
      ) : aDesAtoms ? null : (
        // Rien déposé : le geste qui manque est le dépôt, pas la révision.
        <Button asChild size="lg" className="mt-pas-6 w-full md:w-auto">
          <Link href={`${ROUTES.depots}/nouveau`}>Déposer quelque chose</Link>
        </Button>
      )}
    </section>
  );
}
