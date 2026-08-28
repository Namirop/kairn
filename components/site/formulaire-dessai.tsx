"use client";

import { useRef, useState, type FormEvent } from "react";
import { Apparition, Temps } from "@/components/site/apparition";
import { Button } from "@/components/ui/button";
import { CARACTERES_MAXIMUM_ANONYME, motifDeLongueur } from "@/lib/depots/bornes-du-depot";

/**
 * L'invitation à déposer : le titre, ce qu'on en fait, et le champ.
 *
 * **Le panneau porte la même charpente que les deux sections qui le suivent** —
 * titre à gauche, contenu à droite, même mesure, même grille — tant qu'il
 * invite. Une fois qu'il a un résultat à montrer, il prend la largeur entière :
 * la consigne a été suivie, elle n'a plus à occuper la moitié de l'écran, et
 * c'est `ResultatDeLEssai` qui compose à partir de là.
 *
 * **Il n'y a plus de boîte.** Le champ n'a ni fond, ni bordure, ni contour au
 * repos : ce qu'on écrit se pose à même le papier. C'était déjà la direction du
 * système — « un sol, pas une boîte » — poussée jusqu'au bout.
 *
 * **Il ouvre sur le geste, pas sur l'invitation.** « Essaie » était un verbe
 * seul, sans objet : on lisait un encouragement là où il fallait une consigne.
 * « Dépose quelque chose. » nomme l'acte avec le verbe contractuel du produit.
 */

/**
 * Au-delà, on montre le compteur : avant, il n'apprend rien à personne.
 *
 * Trois quarts du maximum, comme dans le formulaire du produit. La borne, elle,
 * est importée et non recopiée : deux nombres qui doivent être égaux et qui
 * vivent à deux endroits finissent par diverger, et c'est l'écran qui ment
 * pendant que le serveur refuse.
 */
const SEUIL_COMPTEUR = Math.floor(CARACTERES_MAXIMUM_ANONYME * 0.75);

export function FormulaireDEssai({
  invite,
  action,
  enCours,
  erreurServeur,
  reprise,
}: {
  invite: string;
  action: (donnees: FormData) => void;
  enCours: boolean;
  /** Le refus rendu par l'action, quand il a fallu aller jusqu'au serveur. */
  erreurServeur?: string;
  /** Un découpage a déjà abouti pendant cette visite, et on en redépose un. */
  reprise: boolean;
}) {
  const champ = useRef<HTMLTextAreaElement>(null);
  const [texte, setTexte] = useState("");
  const [erreurLocale, setErreurLocale] = useState<string | null>(null);
  const trop = texte.length > CARACTERES_MAXIMUM_ANONYME;

  /*
    Un dépôt vide se refuse sur place, sans aller-retour.

    Il partait au serveur, revenait avec son motif, et pendant le trajet l'écran
    passait par l'attente : une demi-seconde de « On découpe ton texte. » et
    d'emplacements qui battent, pour un texte qui n'existait pas. Le refus
    arrivait donc précédé d'un traitement qui n'avait rien traité, et ça se
    voyait — c'est un clignotement, sur le seul geste de la page qui convertit.

    La règle est la même des deux côtés parce qu'elle est écrite une fois, dans
    `bornes-du-depot.ts`. L'écran ne devine rien : il applique ce que le serveur
    appliquera, et le serveur reste seul juge de ce qui le concerne — les
    verrous de la visite, l'empreinte d'adresse, le plafond du jour.
  */
  const verifierAvantDenvoyer = (evenement: FormEvent<HTMLFormElement>) => {
    const motif = motifDeLongueur(texte);

    if (!motif) return;

    evenement.preventDefault();
    setErreurLocale(motif);
    champ.current?.focus();
  };

  return (
    <div className="gap-pas-8 md:gap-pas-12 grid md:grid-cols-[1fr_minmax(0,36rem)]">
      <Apparition>
        <Temps>
          <h2 className="font-display text-h2-site leading-[1] font-bold tracking-[-0.02em]">
            Dépose
            <br />
            quelque chose.
          </h2>
        </Temps>
      </Apparition>

      <Apparition>
        <Temps>
          {/* Ce paragraphe ne dit plus ce qu'on peut déposer, il dit ce qu'on
              en fait.

              Il commençait par une énumération — « un article, une réponse
              qu'on t'a donnée, une page de manuel » — juste au-dessus d'un champ
              dont l'invite en fait une autre, et à deux plis d'une troisième
              dans « Tu déposes ». La page disait trois fois la même chose, et
              c'est la première qui devait partir : celle du champ arrive au
              moment du geste, là où la question se pose vraiment.

              Reste le mécanisme, et il annonce exactement ce que le panneau
              montrera ensuite — des concepts, des questions, un retour. */}
          <p className="text-stone-500">
            Kairn découpe ce que tu colles en concepts, en fait des questions, et te les repose
            juste avant que tu les oublies.
          </p>
        </Temps>

        <Temps className="mt-pas-6 md:mt-pas-8">
          <form
            action={action}
            onSubmit={verifierAvantDenvoyer}
            noValidate
            className="gap-pas-4 md:gap-pas-6 flex flex-col"
          >
            {/* L'intitulé se voit, et c'est ce qui manquait. Sans bordure ni
                fond, le champ n'était plus signalé que par un trait sous une
                phrase grise, et cette phrase — l'invite tournante — se lit comme
                du texte de page : on arrivait sur un paragraphe, un blanc, un
                trait, un bouton, sans jamais comprendre qu'il y avait quelque
                chose à écrire.

                Il est collé à sa ligne et détaché du reste : la proximité fait le
                groupe, et c'est elle qui dit où commence et où finit la zone. */}
            <div>
              <label
                htmlFor="essai"
                className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase"
              >
                Ce que tu veux retenir
              </label>

              {/* **La bordure reste, en transparent, et c'est délibéré.** Sans
                  elle, le champ n'aurait plus aucun indicateur de focus : le
                  `focus-visible` du thème est neutralisé ici, précisément pour
                  que son anneau ne redessine pas la boîte qu'on vient d'enlever.
                  Deux pixels transparents au repos ne se voient pas, passent au
                  lichen à l'entrée dans le champ, et ne décalent rien. */}
              <div className="mt-pas-2 focus-within:border-lichen-deep border-b-2 border-transparent transition-colors">
                {/* **Sa hauteur est fixe, et c'est le champ qui défile.** Il
                    grandissait avec son contenu jusqu'à un plafond : à cette
                    taille de corps, coller un article faisait pousser un mur de
                    lettres qui repoussait le bouton hors de l'écran, et la page
                    entière se réorganisait à chaque paragraphe collé. Une hauteur
                    qui ne bouge pas rend la mise en page prévisible, et
                    l'ascenseur retokenisé dit qu'il reste du texte. */}
                <textarea
                  ref={champ}
                  id="essai"
                  name="texte"
                  rows={4}
                  value={texte}
                  onChange={(evenement) => {
                    setTexte(evenement.target.value);
                    // Le message tombe dès qu'on répare, et ne revient qu'au
                    // prochain envoi : le recalculer à chaque frappe ferait
                    // passer « il n'y a rien » à « c'est trop court » au
                    // troisième caractère, sur un texte en train de s'écrire.
                    if (erreurLocale) setErreurLocale(null);
                  }}
                  placeholder={invite}
                  aria-invalid={erreurLocale !== null}
                  className="pb-pas-6 font-display text-h1-app ascenseur-discret h-[clamp(7rem,22vh,13rem)] w-full resize-none overflow-y-auto border-0 bg-transparent leading-[1.12] font-bold tracking-[-0.02em] text-stone-900 outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-stone-400 focus-visible:outline-none"
                />
              </div>
            </div>

            <ActionDuDepot
              enCours={enCours}
              trop={trop}
              longueur={texte.length}
              erreur={erreurLocale ?? erreurServeur}
              reprise={reprise}
            />
          </form>
        </Temps>
      </Apparition>
    </div>
  );
}

/**
 * Le bouton, sa mention, et ce que le dépôt a à dire.
 *
 * Le bouton et sa mention restent sur une ligne : c'était un `flex-wrap`, et la
 * mention passait dessous dès qu'elle ne tenait pas — c'est-à-dire sur tous les
 * téléphones —, où elle prenait la place d'un bloc alors qu'elle n'est qu'une
 * note en marge. Sans le retour à la ligne, c'est la mention qui se plie sur
 * deux lignes étroites : le groupe se déforme au lieu de se casser.
 */
function ActionDuDepot({
  enCours,
  trop,
  longueur,
  erreur,
  reprise,
}: {
  enCours: boolean;
  trop: boolean;
  longueur: number;
  erreur?: string;
  reprise: boolean;
}) {
  return (
    <div>
      <div className="gap-pas-3 md:gap-pas-4 flex items-center">
        <Button
          type="submit"
          size="lg"
          className="px-pas-4 text-petit md:px-pas-8 md:text-corps"
          disabled={enCours || trop}
        >
          {enCours ? "Découpage en cours…" : "Voir ce que ça donne"}
        </Button>

        {/* Le compteur ne paraît qu'à l'approche de la borne. Avant, il n'apprend
            rien et compte à voix haute pendant qu'on écrit ; après, il est la
            seule chose qui dise pourquoi le bouton refuse. Il remplace le libellé
            rassurant plutôt que de s'ajouter à côté : « sans compte, sans email »
            n'a plus rien à faire là au moment où on annonce un refus. */}
        {longueur > SEUIL_COMPTEUR ? (
          <span
            className={`text-mono min-w-0 font-mono tabular-nums ${trop ? "text-alerte" : "text-stone-500"}`}
          >
            {longueur.toLocaleString("fr-FR")} /{" "}
            {CARACTERES_MAXIMUM_ANONYME.toLocaleString("fr-FR")}
          </span>
        ) : (
          <span className="text-petit min-w-0 text-stone-500">Sans compte, sans email.</span>
        )}
      </div>

      {/* Le message n'occupe plus rien tant qu'il n'a rien à dire. Sa place était
          réservée en permanence pour une phrase qui paraît un jour sur cent, et ce
          vide-là poussait le bas du panneau vers le sol qui le termine. Il est
          **sous** le bouton, donc il ne peut de toute façon pas le décaler : il ne
          décale que ce qui vient après, à l'instant où quelqu'un lit une erreur —
          exactement le moment où un déplacement se comprend tout seul.

          `empty:` fait le travail sans condition dans le rendu : la balise reste
          en place pour que le lecteur d'écran ait quelque chose à annoncer, et
          c'est sa marge qui disparaît avec son contenu. */}
      <p className="text-petit mt-pas-2 empty:mt-0" role="status" aria-live="polite">
        {erreur ? <span className="text-alerte">{erreur}</span> : null}
        {!erreur && reprise ? (
          <span className="text-stone-500">
            Ce que tu viens de voir reste à toi : tu le récupères aussi en créant ton compte.
          </span>
        ) : null}
      </p>
    </div>
  );
}
