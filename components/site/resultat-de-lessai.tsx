"use client";

import Link from "next/link";
import { CairnAEmpiler } from "@/components/site/cairn-a-empiler";
import { AttenteAbandonnee, ConceptsEnAttente } from "@/components/site/concepts-en-attente";
import { EchantillonDeQuestions } from "@/components/site/echantillon-de-questions";
import { EssaiSansConcept } from "@/components/site/essai-sans-concept";
import { PileDeConcepts } from "@/components/site/pile-de-concepts";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";
import type { AvancementDeLEssai } from "@/lib/depots/essai-en-cours";
import type { EtatDeLAttente } from "@/lib/depots/rythme-de-lattente";

/**
 * Ce que l'essai a donné : l'attente, les concepts, ou aucun des deux.
 *
 * Séparé du formulaire parce que ce sont deux écrans, pas deux états d'un même —
 * l'un demande quelque chose, l'autre rend un verdict, et le second a trois fins
 * qui ne se disent pas de la même façon.
 *
 * **Il prend le panneau entier, et c'est le changement qui porte tout le reste.**
 * Le résultat vivait dans la colonne de droite qui avait porté le champ : trente-
 * six rem pour la seule preuve du produit, pendant que la moitié gauche de
 * l'écran gardait un titre et du vide. Tout y était donc au même corps, dans la
 * même colonne, à la queue leu leu — le nombre de concepts en petites capitales,
 * les concepts en corps, la question en corps, le bouton sous les deux. Rien ne
 * ressortait parce que rien n'avait la place de ressortir.
 *
 * Ce qui change, dans l'ordre : le nombre de concepts devient le titre de la
 * bande, en display, à la place de « Dépose quelque chose. » — la consigne a été
 * suivie, elle n'a plus à occuper la moitié de l'écran ; les concepts s'étalent
 * sur deux colonnes sans rien couper ; les questions deviennent un objet à part,
 * avec ses formats et sa carte ; l'appel à garder ferme la descente.
 *
 * La bande dépasse alors le pli, et c'est assumé : elle raconte maintenant une
 * suite — ton texte, tes concepts, ta question, garde-les — et une suite se
 * descend. Ce qu'on gagne à la déplier vaut mieux que ce qu'on perdait à tout
 * tasser au-dessus de la ligne de flottaison.
 *
 * **Le jeu d'attente est monté ici, et c'est le seul endroit possible.** L'essai
 * se joue en deux temps qui ne durent pas pareil — six secondes de médiane pour
 * le découpage, vingt pour l'écriture des questions —, et chacun se rend par une
 * branche différente de ce composant. Un occupant posé dans l'une des deux se
 * démonte au passage à l'autre : la pile qu'on venait de commencer disparaît au
 * moment précis où l'attente devient longue. Posé ici, au même rang dans l'arbre
 * quelle que soit la branche, il traverse les deux et ignore l'étape en cours.
 */

export function ResultatDeLEssai({
  avancement,
  setRecommence,
  attente,
  onVerifier,
}: {
  avancement: AvancementDeLEssai | null;
  setRecommence: (valeur: boolean) => void;
  /** Depuis combien de temps on attend, et si l'on cherche encore. */
  attente: EtatDeLAttente;
  onVerifier: () => void;
}) {
  /*
    On montre ce qui existe dès qu'il existe.

    L'essai se joue en deux temps — les concepts, puis les questions écrites sur
    le premier d'entre eux qui soit questionnable —, et attendre le second temps
    pour afficher le premier ferait payer à tout le monde l'ajout des questions :
    on verrait le résultat plus tard qu'avant, pour en avoir plus. C'est
    l'inverse de ce qu'on cherche.
  */
  const rienEncore = !avancement || avancement.concepts.length === 0;

  // Le jeu ne se propose que tant que quelque chose tourne, et il disparaît dès
  // que tout est là : c'est un occupant d'attente, pas une section de la page.
  //
  // Il ne s'efface avant ça qu'à un seul endroit : l'écran qui n'a rien à
  // montrer **et** sur lequel on a cessé de chercher. Là, il n'y a plus
  // d'attente à occuper, seulement un geste à faire. Partout ailleurs il reste,
  // et c'est aux quinze secondes qu'il sert le plus — on est alors parti pour
  // bien plus long que la normale.
  const abandonne = attente === "ABANDONNEE";
  const attend = (!avancement || avancement.enCours) && !(rienEncore && abandonne);

  if (rienEncore && (!avancement || avancement.enCours)) {
    return (
      <AvecLeJeu jeu={attend}>
        {abandonne ? (
          <AttenteAbandonnee onVerifier={onVerifier} />
        ) : (
          <ConceptsEnAttente attente={attente} />
        )}
      </AvecLeJeu>
    );
  }

  if (!avancement || avancement.concepts.length === 0) {
    return avancement ? (
      <EssaiSansConcept avancement={avancement} setRecommence={setRecommence} />
    ) : null;
  }

  const combien = avancement.concepts.length;

  return (
    <AvecLeJeu jeu={attend}>
      <div className="gap-pas-8 md:gap-pas-12 flex flex-col" role="status">
        <header className="gap-pas-3 flex flex-col">
          <h2 className="font-display text-h2-site leading-[1] font-bold tracking-[-0.02em] text-stone-900 tabular-nums">
            {combien} {combien === 1 ? "concept." : "concepts."}
          </h2>

          <p className="text-corps max-w-xl text-stone-500">
            {combien === 1
              ? "Il te sera reposé seul, au moment où tu allais l'oublier."
              : "Chacun sera reposé séparément, au moment où tu allais l'oublier."}
          </p>
        </header>

        <PileDeConcepts concepts={avancement.concepts} />

        {/* L'échantillon, et il ferme l'arc : ton texte, tes concepts, de vraies
          questions sur l'un d'eux. Sans lui, la page promettait qu'on te les
          repose sans jamais te montrer sous quelle forme. */}
        <EchantillonDeQuestions questions={avancement.questions} enCours={avancement.enCours} />

        <GarderLesConcepts peutRedeposer={avancement.peutRedeposer} setRecommence={setRecommence} />
      </div>
    </AvecLeJeu>
  );
}

/**
 * Le corps de l'essai, et le jeu à côté tant qu'on attend.
 *
 * Le jeu est **toujours le second enfant de ce composant**, quelle que soit la
 * branche rendue au-dessus. C'est ce qui le fait survivre au passage du
 * découpage à l'écriture des questions : React garde un composant qui ne change
 * ni de position ni de type, et le démonte dès que l'un des deux bouge.
 *
 * Sur téléphone il passe **dessous**, après le titre et les emplacements en
 * attente, parce qu'il n'y a pas de côté. Il est passé un temps au-dessus, pour
 * que ceux qui ne défilent pas le voient quand même : c'était mettre le
 * remplissage devant la charge utile. Ce qu'on vient de déposer se voit
 * d'abord, le jeu s'offre ensuite.
 *
 * La colonne de droite a une largeur fixe et non `auto` : le jeu est le seul
 * élément du produit qui montre le cairn en train de se monter, et une colonne
 * qui se serre sur sa boîte le réduisait à une vignette dans un panneau vide.
 */
function AvecLeJeu({ jeu, children }: { jeu: boolean; children: React.ReactNode }) {
  if (!jeu) return <>{children}</>;

  return (
    <div className="gap-pas-8 md:gap-pas-12 grid md:grid-cols-[minmax(0,1fr)_18rem] md:items-start">
      <div className="min-w-0">{children}</div>

      <div className="md:pt-pas-4">
        <CairnAEmpiler />
      </div>
    </div>
  );
}

/**
 * La fin de la descente : garder ce qu'on vient de voir, ou déposer autre chose.
 *
 * Le second geste n'existait pas, parce qu'il n'y avait rien derrière : un essai
 * qui avait abouti fermait la visite pour les sept jours du cookie. Il ne
 * s'affiche que lorsque la base l'accorde vraiment — deux essais par tranche de
 * vingt-quatre heures —, faute de quoi on proposerait un geste que le serveur
 * refuserait à l'arrivée.
 *
 * Il est discret et il le reste. C'est une porte de sortie posée juste sous
 * l'appel qu'on cherche à provoquer : lui donner le même poids qu'à « Les
 * garder » reviendrait à proposer de recommencer à quelqu'un qu'on vient de
 * convaincre.
 */
function GarderLesConcepts({
  peutRedeposer,
  setRecommence,
}: {
  peutRedeposer: boolean;
  setRecommence: (valeur: boolean) => void;
}) {
  return (
    <div className="gap-pas-4 flex flex-col">
      <div className="gap-pas-4 flex flex-wrap items-center">
        <Button asChild size="lg">
          <Link href={ROUTES.connexion}>Les garder</Link>
        </Button>

        <span className="text-petit max-w-2xl text-stone-500">
          Ton adresse suffit. On te les repose au bon moment, et tu récupères ceux-ci.
        </span>
      </div>

      {peutRedeposer ? (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="self-start px-0"
          onClick={() => setRecommence(true)}
        >
          Déposer autre chose
        </Button>
      ) : null}
    </div>
  );
}
