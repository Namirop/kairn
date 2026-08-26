"use client";

import { useActionState, useEffect, useState } from "react";
import { avancementDeLEssaiAction, essayerAction, type EtatEssai } from "@/app/(marketing)/actions";
import { ResultatDeLEssai } from "@/components/site/resultat-de-lessai";
import { Button } from "@/components/ui/button";
import { CARACTERES_MAXIMUM_ANONYME } from "@/lib/depots/bornes-du-depot";
import type { AvancementDeLEssai } from "@/lib/depots/essai-en-cours";

/**
 * L'essai, sur la landing : on dépose, et les concepts arrivent pour de vrai.
 *
 * C'est le cœur de la conversion, et la raison de tout le mécanisme de session
 * anonyme derrière. Montrer le découpage convainc ; le promettre fait fermer
 * l'onglet. Le compte n'est demandé qu'après, pour garder ce qu'on vient de voir
 * apparaître — à ce moment-là, on sait ce qu'on garde.
 *
 * L'extraction est asynchrone, donc l'écran redemande où elle en est. C'est le
 * seul endroit du produit qui interroge en boucle, et il s'arrête dès que la
 * chaîne s'est arrêtée.
 */

/**
 * Le rythme de l'interrogation, et les deux moments où il change.
 *
 * Une seconde d'abord : le résultat apparaît au plus tard une seconde après être
 * prêt, l'appel est léger, et une demi-seconde de retard se voit sur cinq.
 *
 * **À quinze secondes, on le dit.** Une minute de tourniquet était une minute où
 * plus personne ne regardait — quelqu'un qui attend cinq secondes d'habitude est
 * parti bien avant. Mais on ne s'arrête pas pour autant : un pavé de quatre mille
 * caractères peut mettre vingt secondes sans que rien n'aille mal, et couper à
 * quinze condamnerait une extraction qui allait aboutir. On ralentit à cinq
 * secondes, l'écran dit qu'il ne sait plus, et si le résultat tombe il s'affiche
 * de lui-même — le bouton « Vérifier maintenant » ne fait qu'accélérer.
 *
 * **À quatre-vingt-dix secondes, on arrête vraiment.** Au-delà, ce n'est plus une
 * extraction lente, c'est un job reporté ou perdu : le cron le reprendra, et
 * l'écran n'a plus rien à apprendre en insistant.
 */
const RYTHME_VIF_MS = 1000;
const RYTHME_LENT_MS = 5000;
const AVEU_MS = 15_000;
const ABANDON_MS = 90_000;

/**
 * Au-delà, on montre le compteur : avant, il n'apprend rien à personne.
 *
 * Trois quarts du maximum, comme dans le formulaire du produit. La borne, elle,
 * est importée et non recopiée : deux nombres qui doivent être égaux et qui
 * vivent à deux endroits finissent par diverger, et c'est l'écran qui ment
 * pendant que le serveur refuse.
 */
const SEUIL_COMPTEUR = Math.floor(CARACTERES_MAXIMUM_ANONYME * 0.75);

export function EssaiDeDepot({
  invite,
  essaiPrecedent,
}: {
  invite: string;
  /** Ce qu'une visite antérieure a déjà produit. Lu côté serveur au chargement. */
  essaiPrecedent: AvancementDeLEssai | null;
}) {
  const [etat, action, enCours] = useActionState<EtatEssai, FormData>(essayerAction, {});
  const [avancement, setAvancement] = useState<AvancementDeLEssai | null>(essaiPrecedent);
  // Remet le champ après un essai qui n'a rien donné. La base tranchera : elle
  // n'accorde qu'une seconde chance, et seulement si la première a échoué.
  const [recommence, setRecommence] = useState(false);
  const [texte, setTexte] = useState("");
  const trop = texte.length > CARACTERES_MAXIMUM_ANONYME;
  // L'interrogation s'est arrêtée sans résultat. Un état à part et non l'absence
  // d'intervalle : c'est ce que l'écran doit dire, et il faut qu'il le sache.
  const [attenteInterrompue, setAttenteInterrompue] = useState(false);
  const [relance, setRelance] = useState(0);
  const [dernierEssai, setDernierEssai] = useState<string | null>(null);

  // Un essai vient de partir : l'écran repart de zéro.
  //
  // Ajusté pendant le rendu plutôt que dans un effet, parce qu'un effet aurait
  // laissé une image afficher le verdict du **premier** essai — « ce texte n'a
  // rien donné » sur un dépôt qui vient tout juste d'être envoyé. React
  // recommence le rendu sans rien poser à l'écran entre les deux.
  //
  // `recommence` en particulier n'était jamais remis à faux nulle part : une
  // fois « Réessayer » cliqué, le composant rendait le formulaire pour toujours
  // et le second essai, qui avait bien tourné et bien coûté, ne s'affichait
  // jamais.
  if (etat.inputId && etat.inputId !== dernierEssai) {
    setDernierEssai(etat.inputId);
    setRecommence(false);
    setAttenteInterrompue(false);
    setAvancement(null);
  }

  // On interroge aussi quand la page se charge sur un découpage déjà en route.
  // Sans ça, un rechargement pendant l'extraction figeait l'écran sur l'attente :
  // l'intervalle ne démarrait qu'au retour de l'action, et il n'y en avait pas.
  const aPoursuivre = Boolean(etat.inputId) || Boolean(essaiPrecedent?.enCours);

  useEffect(() => {
    if (!aPoursuivre) return;

    let vivant = true;
    let ecoule = RYTHME_VIF_MS;
    let minuteur: ReturnType<typeof setTimeout>;

    // Un enchaînement de délais plutôt qu'un intervalle : le rythme change en
    // cours de route, et un `setInterval` ne sait pas ralentir.
    const tour = async () => {
      const suite = await avancementDeLEssaiAction();

      if (!vivant) return;

      setAvancement(suite);

      if (!suite?.enCours) return;
      if (ecoule >= AVEU_MS) setAttenteInterrompue(true);
      if (ecoule >= ABANDON_MS) return;

      const pause = ecoule < AVEU_MS ? RYTHME_VIF_MS : RYTHME_LENT_MS;

      ecoule += pause;
      minuteur = setTimeout(tour, pause);
    };

    minuteur = setTimeout(tour, RYTHME_VIF_MS);

    return () => {
      vivant = false;
      clearTimeout(minuteur);
    };
    // `etat.inputId` et non la session : deux essais d'une même visite portent
    // la même session, la dépendance ne changeait donc pas de valeur et l'effet
    // n'était jamais rejoué. L'écran restait sur l'avancement du premier.
  }, [etat.inputId, aPoursuivre, relance]);

  // Reprend l'interrogation pour un tour complet. La minute est repartie de
  // zéro : c'est un geste volontaire, pas une reprise automatique.
  const verifierANouveau = () => {
    setAttenteInterrompue(false);
    setRelance((tour) => tour + 1);
  };

  // L'attente commence au clic et non au retour de l'action : entre les deux
  // il y a un aller-retour, et pendant cet aller-retour seul le libellé du
  // bouton changeait — l'écran avait l'air de n'avoir rien reçu. `enCours` est
  // donc en tête et hors du `!recommence` : un second essai part depuis le
  // formulaire, et sans ça il n'aurait pas eu droit à cette attente-là.
  //
  // Un essai déjà fait se remontre plutôt que de laisser un champ vide : sinon
  // le refus d'un second essai désigne des concepts que personne ne voit.
  if (enCours || (!recommence && (etat.sessionId || essaiPrecedent))) {
    return (
      <ResultatDeLEssai
        // Un dépôt en vol efface le verdict du précédent. Sans ça, le temps de
        // l'aller-retour, l'écran affiche « ce texte n'a rien donné » à propos
        // d'un texte qu'on vient d'envoyer.
        avancement={enCours ? null : avancement}
        setRecommence={setRecommence}
        attenteInterrompue={attenteInterrompue}
        onVerifier={verifierANouveau}
      />
    );
  }

  return (
    <form action={action} noValidate className="gap-pas-4 md:gap-pas-6 flex flex-col">
      {/* L'intitulé se voit, et c'est ce qui manquait.
          Sans bordure ni fond, le champ n'était plus signalé que par un trait
          sous une phrase grise, et cette phrase — l'invite tournante — se lit
          comme du texte de page : on arrivait sur un paragraphe, un blanc, un
          trait, un bouton, sans jamais comprendre qu'il y avait quelque chose à
          écrire. Le trait dit « on écrit sur cette ligne » à qui a déjà compris ;
          il ne dit rien à qui découvre.

          L'intitulé le dit, dans le registre des libellés techniques du
          produit — le même que « Ce que tu as déposé » ou « Ton cairn ». C'est
          la solution qui coûte le moins au parti pris d'origine : aucune boîte
          ne revient, rien n'est encadré, on nomme simplement le champ au lieu de
          compter sur son trait.

          Il est collé à sa ligne et détaché du reste : la proximité fait le
          groupe, et c'est elle qui dit où commence et où finit la zone. */}
      <div>
        <label
          htmlFor="essai"
          className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase"
        >
          Ce que tu veux retenir
        </label>

        {/* Plus de boîte du tout, pas même un trait.
          Le champ a d'abord perdu son rectangle bordé, puis le trait qui l'avait
          remplacé : ce qu'on écrit se pose à même le papier, au-dessus de la
          ligne d'horizon que `SolDeLEssai` tire derrière le panneau. C'est le
          bout du chemin qu'avait commencé « un sol, pas une boîte » — le sol
          existe toujours, il est juste devenu celui du paysage plutôt que celui
          du composant.

          **La bordure reste, en transparent, et c'est délibéré.** Sans elle, le
          champ n'aurait plus aucun indicateur de focus : le `focus-visible` du
          thème est neutralisé sur ce champ, précisément pour que son anneau ne
          redessine pas la boîte qu'on vient d'enlever. Deux pixels transparents
          au repos ne se voient pas, passent au lichen à l'entrée dans le champ,
          et ne décalent rien — un changement d'épaisseur aurait bougé le bouton
          d'un pixel à chaque fois. */}
        <div className="mt-pas-2 focus-within:border-lichen-deep border-b-2 border-transparent transition-colors">
          {/* Le champ grandit avec ce qu'on y met, jusqu'à une borne.
            Sans elle, un article collé poussait le bouton hors de l'écran : le
            geste suivant disparaissait au moment où on venait de le préparer.
            Au-delà, c'est le champ qui défile, pas la page.

            La borne se dit en `rem` et non en lignes mesurées, contrairement à
            la liste de concepts : on écrit ici, et la seule chose qui doive
            rester visible est la ligne courante — le navigateur y descend tout
            seul. Pour la même raison, l'ascenseur reste au lieu d'être remplacé
            par un chevron : il faudrait le poser sur la ligne qu'on tape.
            Retokenisé, faute de quoi le rail gris de Windows serait le seul
            objet de la page dessiné par quelqu'un d'autre.

            La taille est celle d'un titre d'écran, en display : le panneau
            occupe un pli entier, et ce qu'on y écrit doit en être le plus gros
            objet. C'est ce qui fait qu'on écrit au lieu de remplir.

            **Sa hauteur est fixe, et c'est le champ qui défile.** Il grandissait
            avec son contenu jusqu'à un plafond : à cette taille de corps, coller
            un article faisait pousser un mur de lettres qui repoussait le bouton
            hors de l'écran bien avant d'atteindre la borne, et la page entière
            se réorganisait à chaque paragraphe collé. Une hauteur qui ne bouge
            pas rend la mise en page prévisible — on voit toujours le geste
            suivant — et l'ascenseur retokenisé dit qu'il reste du texte. */}
          <textarea
            id="essai"
            name="texte"
            rows={4}
            value={texte}
            onChange={(evenement) => setTexte(evenement.target.value)}
            placeholder={invite}
            className="pb-pas-6 font-display text-h1-app ascenseur-discret h-[clamp(7rem,22vh,13rem)] w-full resize-none overflow-y-auto border-0 bg-transparent leading-[1.12] font-bold tracking-[-0.02em] text-stone-900 outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-stone-400 focus-visible:outline-none"
          />
        </div>
      </div>

      {/* Le bouton et sa mention sur une seule ligne, et ils y restent.
          C'était un `flex-wrap` : la mention passait dessous dès qu'elle ne
          tenait pas — c'est-à-dire sur tous les téléphones —, et elle y prenait
          la place d'un bloc à elle seule alors qu'elle n'est qu'une note en marge
          du bouton. Sans le retour à la ligne, c'est **la mention** qui se plie
          sur deux lignes étroites quand la largeur manque, à droite du bouton :
          le groupe se déforme au lieu de se casser.

          Le bouton garde ses quarante-quatre pixels de haut — c'est la cible
          tactile, elle ne se négocie pas — et ne rend que du rembourrage
          horizontal et un cran de corps sur mobile. Sur un écran de trois cent
          quatre-vingt-dix, c'est ce qui laisse à la mention les cent cinquante
          pixels d'une ligne. */}
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

          {/* Le compteur ne paraît qu'à l'approche de la borne. Avant, il
              n'apprend rien et compte à voix haute pendant qu'on écrit ; après,
              il est la seule chose qui dise pourquoi le bouton refuse. Le même
              seuil que dans le formulaire du produit — trois quarts du maximum.

              Il remplace le libellé rassurant plutôt que de s'ajouter à côté :
              « sans compte, sans email » n'a plus rien à faire là au moment où
              on annonce un refus. */}
          {texte.length > SEUIL_COMPTEUR ? (
            <span
              className={`text-mono min-w-0 font-mono tabular-nums ${trop ? "text-alerte" : "text-stone-500"}`}
            >
              {texte.length.toLocaleString("fr-FR")} /{" "}
              {CARACTERES_MAXIMUM_ANONYME.toLocaleString("fr-FR")}
            </span>
          ) : (
            <span className="text-petit min-w-0 text-stone-500">Sans compte, sans email.</span>
          )}
        </div>

        {/* Le message n'occupe plus rien tant qu'il n'a rien à dire.
          Sa place était réservée en permanence — une ligne, plus le rythme du
          formulaire autour — pour une phrase qui paraît un jour sur cent, et ce
          vide-là poussait le bas du panneau vers le sol qui le termine.

          La réserve ne protégeait d'ailleurs pas ce qu'elle prétendait : le
          message est **sous** le bouton, il ne peut pas le décaler. Il ne
          décalait que ce qui vient après, et le faire à l'instant où quelqu'un
          lit une erreur est exactement le moment où un déplacement se comprend
          tout seul.

          `empty:` fait le travail sans condition dans le rendu : la balise reste
          en place pour que le lecteur d'écran ait quelque chose à annoncer, et
          c'est sa marge qui disparaît avec son contenu. */}
        <p className="text-petit mt-pas-2 empty:mt-0" role="status" aria-live="polite">
          {etat.erreur ? <span className="text-alerte">{etat.erreur}</span> : null}
        </p>
      </div>
    </form>
  );
}
