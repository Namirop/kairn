"use client";

import Link from "next/link";
import { AttenteInterrompue, ConceptsEnAttente } from "@/components/site/concepts-en-attente";
import { PileDeConcepts } from "@/components/site/pile-de-concepts";
import { Button } from "@/components/ui/button";
import { CARACTERES_MAXIMUM, longueurEnClair } from "@/lib/depots/bornes-du-depot";
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
  /*
    On montre ce qui existe dès qu'il existe.

    L'essai se joue maintenant en deux temps — les concepts, puis la question
    écrite sur le premier d'entre eux qui soit questionnable —, et attendre le
    second temps pour afficher le premier ferait payer à tout le monde l'ajout
    de la question : on verrait le résultat plus tard qu'avant, pour en avoir
    plus. C'est l'inverse de ce qu'on cherche.
  */
  const rienEncore = !avancement || avancement.concepts.length === 0;

  if (rienEncore && (!avancement || avancement.enCours)) {
    return attenteInterrompue ? (
      <AttenteInterrompue onVerifier={onVerifier} />
    ) : (
      <ConceptsEnAttente />
    );
  }

  if (!avancement || avancement.concepts.length === 0) {
    return avancement ? (
      <EssaiSansConcept avancement={avancement} setRecommence={setRecommence} />
    ) : null;
  }

  return (
    <div className="gap-pas-4 flex flex-col" role="status">
      <p className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">
        {avancement.concepts.length}{" "}
        {avancement.concepts.length === 1 ? "concept trouvé" : "concepts trouvés"}
      </p>

      <PileDeConcepts concepts={avancement.concepts} />

      {/* L'échantillon, et il ferme l'arc : ton texte, tes concepts, une vraie
          question sur l'un d'eux. Sans lui, la page promettait qu'on te repose
          quelque chose sans jamais te montrer quoi. */}
      <Echantillon question={avancement.question} enCours={avancement.enCours} />

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
 * L'essai n'a rien donné. **Quatre** situations, et elles ne se confondent pas.
 *
 * Deux causes qui ne s'imputent pas à la même personne, croisées avec le fait
 * qu'il reste ou non de quoi retenter. La fonction n'en couvrait que trois, et
 * la manquante était la plus contradictoire de toutes : « cet essai ne t'est pas
 * compté » sous un bouton qui referme la visite. On annonçait la gratuité et on
 * fermait la porte dans la même phrase.
 *
 * **Panne, avec une reprise.** Rien à demander à quelqu'un qui n'y est pour
 * rien : on dit que ça vient de nous, et surtout pas de changer son texte — il
 * n'y avait rien à y changer.
 *
 * **Panne, et plus de reprise.** Les pannes tolérées sont épuisées. Ce n'est
 * toujours pas sa faute, et le dire reste la première chose à faire ; ce qui
 * change, c'est qu'on ne peut plus rien lui proposer ici. Le compte devient la
 * seule suite honnête, et il est offert pour ce qu'il permettra vraiment —
 * reprendre plus tard —, pas pour garder des concepts qui n'existent pas.
 *
 * **Rejet, avec un essai qui reste.** Le motif du modèle dit ce qui manquait ;
 * c'est la seule chose de valeur qu'un rejet produise, et c'est elle qui apprend
 * à mieux déposer.
 *
 * **Rejet, et plus d'essai.** On garde le motif à l'écran — il reste la raison,
 * et elle est valable — et on propose le compte sans prétendre qu'il y a quoi
 * que ce soit à récupérer.
 */
type Situation = { constat: string; explication: string };

function situationDeLEchec(
  panne: boolean,
  peutRedeposer: boolean,
  motifDechec: string | null,
): Situation {
  if (panne && peutRedeposer) {
    return {
      constat: "Le découpage n'a pas abouti, et ça ne vient pas de ton texte.",
      explication: "Cet essai ne t'est pas compté. Relance-le, ou reviens dans un moment.",
    };
  }

  if (panne) {
    return {
      constat: "Le découpage ne répond pas en ce moment.",
      explication:
        "Ça ne vient pas de ton texte, et rien ne t'a été compté. Avec un compte, tu pourras reprendre dès que ce sera rétabli.",
    };
  }

  const constat = motifDechec ?? "Ce texte n'a rien donné à retenir.";

  if (peutRedeposer) {
    return {
      constat,
      explication:
        "Retente avec une explication, une règle, un mécanisme — quelque chose que tu voudrais savoir dans un mois.",
    };
  }

  return {
    constat,
    explication: `Un compte accepte ${longueurEnClair(CARACTERES_MAXIMUM)}, garde ce qu'il en tire, et te le repose au bon moment.`,
  };
}

/**
 * La question de l'essai, ou son attente.
 *
 * Elle arrive après les concepts, donc il y a un moment où la liste est là et
 * pas elle. Ce moment se dit — une ligne, au même endroit que la question
 * viendra prendre — plutôt que de laisser un blanc qui ressemble à une fin.
 */
function Echantillon({ question, enCours }: { question: string | null; enCours: boolean }) {
  if (!question && !enCours) return null;

  return (
    <div className="mt-pas-2">
      <p className="text-mono font-mono tracking-[0.14em] text-stone-500 uppercase">
        Ce qu&apos;on te reposera
      </p>

      {question ? (
        <p className="mt-pas-2 text-corps text-stone-900">{question}</p>
      ) : (
        <p className="mt-pas-2 text-petit text-stone-500">On l&apos;écrit, deux secondes.</p>
      )}
    </div>
  );
}

function EssaiSansConcept({
  avancement,
  setRecommence,
}: {
  avancement: AvancementDeLEssai;
  setRecommence: (valeur: boolean) => void;
}) {
  const { panne, peutRedeposer, motifDechec } = avancement;
  const situation = situationDeLEchec(panne, peutRedeposer, motifDechec);

  return (
    <div className="gap-pas-3 flex flex-col" role="status">
      <p className="text-corps text-stone-900">{situation.constat}</p>

      <p className="text-petit max-w-md text-stone-500">{situation.explication}</p>

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
