"use client";

import { useActionState, useEffect, useState } from "react";
import { avancementDeLEssaiAction, essayerAction, type EtatEssai } from "@/app/(marketing)/actions";
import { ResultatDeLEssai } from "@/components/site/resultat-de-lessai";
import { Button } from "@/components/ui/button";
import { CARACTERES_MAXIMUM_ANONYME } from "@/lib/depots/bornes-de-lessai";
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

// Une seconde : le résultat apparaît au plus tard une seconde après être prêt.
// L'appel est léger, et une demi-seconde de retard se voit sur cinq secondes.
const RYTHME_MS = 1000;
const ESSAIS_MAXIMUM = 60;

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

  // On interroge aussi quand la page se charge sur un découpage déjà en route.
  // Sans ça, un rechargement pendant l'extraction figeait l'écran sur l'attente :
  // l'intervalle ne démarrait qu'au retour de l'action, et il n'y en avait pas.
  const aPoursuivre = Boolean(etat.sessionId) || Boolean(essaiPrecedent?.enCours);

  useEffect(() => {
    if (!aPoursuivre) return;

    let vivant = true;
    let tours = 0;

    const battement = setInterval(async () => {
      tours += 1;

      const suite = await avancementDeLEssaiAction();

      if (!vivant) return;

      setAvancement(suite);

      if (!suite?.enCours) {
        clearInterval(battement);
        return;
      }

      if (tours >= ESSAIS_MAXIMUM) {
        clearInterval(battement);
        setAttenteInterrompue(true);
      }
    }, RYTHME_MS);

    return () => {
      vivant = false;
      clearInterval(battement);
    };
  }, [aPoursuivre, relance]);

  // Reprend l'interrogation pour un tour complet. La minute est repartie de
  // zéro : c'est un geste volontaire, pas une reprise automatique.
  const verifierANouveau = () => {
    setAttenteInterrompue(false);
    setRelance((tour) => tour + 1);
  };

  // L'attente commence au clic et non au retour de l'action : entre les deux
  // il y a un aller-retour, et pendant cet aller-retour seul le libellé du
  // bouton changeait — l'écran avait l'air de n'avoir rien reçu.
  // Un essai déjà fait se remontre plutôt que de laisser un champ vide : sinon
  // le refus d'un second essai désigne des concepts que personne ne voit.
  if (!recommence && (enCours || etat.sessionId || essaiPrecedent)) {
    return (
      <ResultatDeLEssai
        avancement={avancement}
        setRecommence={setRecommence}
        attenteInterrompue={attenteInterrompue}
        onVerifier={verifierANouveau}
      />
    );
  }

  return (
    <form action={action} noValidate className="gap-pas-6 flex flex-col">
      <label htmlFor="essai" className="sr-only">
        Ce que tu veux retenir
      </label>

      {/* Un sol, pas une boîte.
          Le rectangle bordé à coins arrondis était le seul objet posé de la
          page : partout ailleurs, ce qui sépare est une surface ou une coupe de
          roche, et ce qui soutient est un trait — celui sous le cairn, dont le
          composant dit déjà « le sol : un trait, pas une ombre portée ». Le
          champ s'écrit donc à même le papier, sur ce trait-là.

          Le trait porte aussi le focus, et c'est pour ça qu'il fait deux pixels
          au repos : un `:focus-visible` s'applique à un champ de texte même
          cliqué à la souris, et l'anneau du thème aurait redessiné la boîte
          qu'on vient d'enlever. Le passage au lichen le remplace — le lichen
          signale, c'est son emploi. Épaissir au lieu de changer de teinte aurait
          décalé le bouton d'un pixel à chaque entrée dans le champ.

          Le trait est en `stone-500` et non dans le gris du sol sous le cairn :
          sans bordure ni fond, il est devenu la seule chose qui dit qu'il y a un
          champ ici, et à ce titre il lui faut trois pour un contre le papier.
          Le gris du cairn n'en donnait que 1,63 — assez pour une décoration,
          pas pour une limite de composant. */}
      <div className="focus-within:border-lichen-deep border-b-2 border-stone-500 transition-colors">
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

            La taille passe au corps de texte. En `h2-app`, un pavé collé
            s'affichait plus gros que les concepts qui le remplacent à l'écran
            juste après, et l'échange des deux se voyait comme un saut. */}
        <textarea
          id="essai"
          name="texte"
          rows={4}
          value={texte}
          onChange={(evenement) => setTexte(evenement.target.value)}
          placeholder={invite}
          className="pb-pas-4 text-corps field-sizing-content ascenseur-discret max-h-[14rem] min-h-32 w-full resize-none overflow-y-auto border-0 bg-transparent leading-relaxed text-stone-900 outline-none placeholder:text-stone-500 focus-visible:outline-none"
        />
      </div>

      <div className="gap-pas-4 flex flex-wrap items-center">
        <Button type="submit" size="lg" disabled={enCours || trop}>
          {enCours ? "Découpage en cours…" : "Voir ce que ça donne"}
        </Button>

        {/* Le compteur ne paraît qu'à l'approche de la borne. Avant, il n'apprend
            rien et compte à voix haute pendant qu'on écrit ; après, il est la
            seule chose qui dise pourquoi le bouton refuse. Le même seuil que
            dans le formulaire du produit — trois quarts du maximum.

            Il remplace le libellé rassurant plutôt que de s'ajouter à côté :
            « sans compte, sans email » n'a plus rien à faire là au moment où on
            annonce un refus. */}
        {texte.length > SEUIL_COMPTEUR ? (
          <span
            className={`text-mono font-mono tabular-nums ${trop ? "text-alerte" : "text-stone-500"}`}
          >
            {texte.length.toLocaleString("fr-FR")} /{" "}
            {CARACTERES_MAXIMUM_ANONYME.toLocaleString("fr-FR")}
          </span>
        ) : (
          <span className="text-petit text-stone-500">Sans compte, sans email.</span>
        )}
      </div>

      {/* L'espace du message est réservé : l'erreur ne décale pas le bouton. */}
      <p className="text-petit min-h-5" role="status" aria-live="polite">
        {etat.erreur ? <span className="text-alerte">{etat.erreur}</span> : null}
      </p>
    </form>
  );
}

