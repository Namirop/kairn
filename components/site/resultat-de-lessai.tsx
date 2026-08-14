"use client";

import Link from "next/link";
import { AttenteInterrompue, ConceptsEnAttente } from "@/components/site/concepts-en-attente";
import { PileDeConcepts } from "@/components/site/pile-de-concepts";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";
import type { AvancementDeLEssai } from "@/lib/depots/essai-en-cours";

/**
 * Ce que l'essai a donné : l'attente, les concepts, ou aucun des deux.
 *
 * Séparé du formulaire parce que ce sont deux écrans, pas deux états d'un même —
 * l'un demande quelque chose, l'autre rend un verdict, et le second a trois fins
 * qui ne se disent pas de la même façon.
 */

export function ResultatDeLEssai({
  avancement,
  setRecommence,
  attenteInterrompue,
  onVerifier,
}: {
  avancement: AvancementDeLEssai | null;
  setRecommence: (valeur: boolean) => void;
  /** L'écran a cessé d'interroger sans que la chaîne ait rendu quoi que ce soit. */
  attenteInterrompue: boolean;
  onVerifier: () => void;
}) {
  if (!avancement || avancement.enCours) {
    return attenteInterrompue ? (
      <AttenteInterrompue onVerifier={onVerifier} />
    ) : (
      <ConceptsEnAttente />
    );
  }

  if (avancement.concepts.length === 0) {
    return <EssaiSansConcept avancement={avancement} setRecommence={setRecommence} />;
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

/**
 * L'essai n'a rien donné. Trois situations, et elles ne se confondent pas.
 *
 * **Une panne.** Rien à demander à quelqu'un qui n'y est pour rien : on dit que
 * ça vient de nous, et on ne lui suggère surtout pas de changer son texte — il
 * n'y avait rien à y changer. Une panne ne consomme pas d'essai côté base, donc
 * le bouton est là quoi qu'il arrive.
 *
 * **Un rejet, avec un essai qui reste.** Le motif du modèle dit ce qui manquait ;
 * c'est la seule chose de valeur qu'un rejet produise, et c'est elle qui apprend
 * à mieux déposer. On invite à retenter.
 *
 * **Un rejet, et plus d'essai.** C'est le cas qu'on tenait mal : le bouton
 * s'affichait quand même, et le refus qui suivait parlait de « garder tes
 * concepts » à quelqu'un qui n'en avait aucun. On garde le motif à l'écran — il
 * reste la raison, et elle est valable — et on propose le compte pour ce qu'il
 * change vraiment, sans prétendre qu'il y a quoi que ce soit à récupérer.
 */
function commentContinuer(panne: boolean, peutRedeposer: boolean): string {
  if (panne && peutRedeposer) {
    return "Cet essai ne t'est pas compté. Relance-le, ou reviens dans un moment.";
  }

  if (panne) return "Cet essai ne t'est pas compté. Reviens dans un moment.";

  if (peutRedeposer) {
    return "Retente avec une explication, une règle, un mécanisme — quelque chose que tu voudrais savoir dans un mois.";
  }

  return "Un compte accepte des textes deux fois plus longs, garde ce qu'il en tire, et te le repose au bon moment.";
}

function EssaiSansConcept({
  avancement,
  setRecommence,
}: {
  avancement: AvancementDeLEssai;
  setRecommence: (valeur: boolean) => void;
}) {
  const { panne, peutRedeposer, motifDechec } = avancement;

  return (
    <div className="gap-pas-3 flex flex-col" role="status">
      <p className="text-corps text-stone-900">
        {panne
          ? "Le découpage n'a pas abouti, et ça ne vient pas de ton texte."
          : (motifDechec ?? "Ce texte n'a rien donné à retenir.")}
      </p>

      <p className="text-petit max-w-md text-stone-500">{commentContinuer(panne, peutRedeposer)}</p>

      <div className="mt-pas-1">
        {peutRedeposer ? (
          <Button type="button" variant="outline" onClick={() => setRecommence(true)}>
            Réessayer
          </Button>
        ) : (
          <Button asChild size="lg">
            <Link href={ROUTES.connexion}>Créer un compte</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
