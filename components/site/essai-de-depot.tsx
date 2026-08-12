"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import {
  avancementDeLEssaiAction,
  essayerAction,
  type AvancementDeLEssai,
  type EtatEssai,
} from "@/app/(marketing)/actions";
import { ConceptsEnAttente } from "@/components/site/concepts-en-attente";
import { Button } from "@/components/ui/button";
import { TexteTechnique } from "@/components/typographie/texte-technique";
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

export function EssaiDeDepot({ invite }: { invite: string }) {
  const [etat, action, enCours] = useActionState<EtatEssai, FormData>(essayerAction, {});
  const [avancement, setAvancement] = useState<AvancementDeLEssai | null>(null);

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
  if (enCours || etat.sessionId) return <ResultatDeLEssai avancement={avancement} />;

  return (
    <form action={action} noValidate className="gap-pas-3 flex flex-col">
      <label htmlFor="essai" className="sr-only">
        Ce que tu veux retenir
      </label>
      <textarea
        id="essai"
        name="texte"
        rows={5}
        placeholder={invite}
        className="p-pas-4 text-corps field-sizing-content min-h-36 w-full resize-y rounded-xs border border-stone-300 bg-stone-50 leading-relaxed text-stone-900 placeholder:text-stone-500"
      />

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

function ResultatDeLEssai({ avancement }: { avancement: AvancementDeLEssai | null }) {
  if (!avancement || avancement.enCours) return <ConceptsEnAttente />;

  if (avancement.concepts.length === 0) {
    return (
      <div className="gap-pas-3 flex flex-col" role="status">
        <p className="text-corps text-stone-900">
          {avancement.motifDechec ?? "Ce texte n'a rien donné à retenir."}
        </p>
        <p className="text-petit text-stone-500">
          Essaie avec une explication, une règle, un mécanisme — quelque chose que tu voudrais
          savoir dans un mois.
        </p>
      </div>
    );
  }

  return (
    <div className="gap-pas-4 flex flex-col" role="status">
      <p className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">
        {avancement.concepts.length}{" "}
        {avancement.concepts.length === 1 ? "concept trouvé" : "concepts trouvés"}
      </p>

      <ul className="gap-pas-3 flex flex-col">
        {avancement.concepts.map((concept) => (
          <li key={concept.id} className="border-lichen pl-pas-4 border-l-2">
            <p className="text-corps leading-relaxed text-stone-900">
              <TexteTechnique>{concept.concept}</TexteTechnique>
            </p>
          </li>
        ))}
      </ul>

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
