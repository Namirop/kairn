"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { avancementDeLEssaiAction, essayerAction, type EtatEssai } from "@/app/(marketing)/actions";
import type { AvancementDeLEssai } from "@/lib/depots/essai-en-cours";
import { ConceptsEnAttente } from "@/components/site/concepts-en-attente";
import { PileDeConcepts } from "@/components/site/pile-de-concepts";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";

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

  useEffect(() => {
    if (!etat.sessionId) return;

    let vivant = true;
    let tours = 0;

    const battement = setInterval(async () => {
      tours += 1;

      const suite = await avancementDeLEssaiAction();

      if (!vivant) return;

      setAvancement(suite);

      if (!suite?.enCours || tours >= ESSAIS_MAXIMUM) clearInterval(battement);
    }, RYTHME_MS);

    return () => {
      vivant = false;
      clearInterval(battement);
    };
  }, [etat.sessionId]);

  // L'attente commence au clic et non au retour de l'action : entre les deux
  // il y a un aller-retour, et pendant cet aller-retour seul le libellé du
  // bouton changeait — l'écran avait l'air de n'avoir rien reçu.
  // Un essai déjà fait se remontre plutôt que de laisser un champ vide : sinon
  // le refus d'un second essai désigne des concepts que personne ne voit.
  if (!recommence && (enCours || etat.sessionId || essaiPrecedent)) {
    return <ResultatDeLEssai avancement={avancement} setRecommence={setRecommence} />;
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
          placeholder={invite}
          className="pb-pas-4 text-corps field-sizing-content ascenseur-discret max-h-[14rem] min-h-32 w-full resize-none overflow-y-auto border-0 bg-transparent leading-relaxed text-stone-900 outline-none placeholder:text-stone-500 focus-visible:outline-none"
        />
      </div>

      <div className="gap-pas-4 flex flex-wrap items-center">
        <Button type="submit" size="lg" disabled={enCours}>
          {enCours ? "Découpage en cours…" : "Voir ce que ça donne"}
        </Button>
        <span className="text-petit text-stone-500">Sans compte, sans email.</span>
      </div>

      {/* L'espace du message est réservé : l'erreur ne décale pas le bouton. */}
      <p className="text-petit min-h-5" role="status" aria-live="polite">
        {etat.erreur ? <span className="text-alerte">{etat.erreur}</span> : null}
      </p>
    </form>
  );
}

function ResultatDeLEssai({
  avancement,
  setRecommence,
}: {
  avancement: AvancementDeLEssai | null;
  setRecommence: (valeur: boolean) => void;
}) {
  if (!avancement || avancement.enCours) return <ConceptsEnAttente />;

  if (avancement.concepts.length === 0) {
    return (
      <div className="gap-pas-3 flex flex-col" role="status">
        <p className="text-corps text-stone-900">
          {avancement.motifDechec ?? "Ce texte n'a rien donné à retenir."}
        </p>
        <p className="text-petit text-stone-500">
          Retente avec une explication, une règle, un mécanisme — quelque chose que tu voudrais
          savoir dans un mois.
        </p>

        {/* Une seconde chance, et une seule : sans elle, la page la plus
            importante du produit devient une impasse pour qui a collé le mauvais
            texte du premier coup. */}
        <div>
          <Button type="button" variant="outline" onClick={() => setRecommence(true)}>
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="gap-pas-4 flex flex-col" role="status">
      <p className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">
        {avancement.concepts.length}{" "}
        {avancement.concepts.length === 1 ? "concept trouvé" : "concepts trouvés"}
      </p>

      <PileDeConcepts concepts={avancement.concepts} />

      <div className="mt-pas-2 gap-pas-3 flex flex-wrap items-center">
        <Button asChild size="lg">
          <Link href={ROUTES.connexion}>Les garder</Link>
        </Button>
        <span className="text-petit max-w-sm text-stone-500">
          Ton adresse suffit. On te les repose au bon moment, et tu récupères ceux-ci.
        </span>
      </div>
    </div>
  );
}
