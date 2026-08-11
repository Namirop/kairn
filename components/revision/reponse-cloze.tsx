"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { reponseAcceptee, TROU } from "@/lib/domain/reponse-cloze";
import type { ReviewRating } from "@/lib/db/types";

/**
 * Le texte à trou.
 *
 * La vérification est locale et instantanée : les formes acceptées ont été
 * écrites en même temps que la question, il n'y a rien à demander à personne.
 * C'est le seul format qui fait produire une réponse sans faire attendre un
 * jugement.
 *
 * Quand la saisie ne correspond pas, on montre le terme attendu et on laisse
 * dire « je l'avais » — on écrit parfois un synonyme que la liste ne porte pas.
 * C'est le seul jugement demandé sur ce format, et seulement dans ce cas : une
 * bonne réponse, elle, n'est jamais soumise à discussion.
 */

/** La phrase, son trou vide, rempli de ce qu'on saisit, ou du terme attendu. */
function PhraseTrouee({ phrase, comble }: { phrase: string; comble: string | null }) {
  const [avant = "", ...suite] = phrase.split(TROU);

  return (
    <p className="text-corps leading-loose text-stone-900">
      {avant}
      {comble === null ? (
        <span
          aria-hidden
          className="mx-1 inline-block w-24 border-b-2 border-stone-300 align-baseline"
        />
      ) : (
        <span className="border-lichen border-b-2 px-1 font-medium">{comble}</span>
      )}
      {suite.join(TROU)}
    </p>
  );
}

export function ReponseCloze({
  sentence,
  accepted,
  enCours,
  onValider,
  onJuger,
}: {
  sentence: string;
  accepted: string[];
  enCours: boolean;
  /** Fige le chronomètre à la validation, jamais au jugement qui la suit. */
  onValider: () => void;
  onJuger: (note: ReviewRating) => void;
}) {
  const [saisie, setSaisie] = useState("");
  const [rate, setRate] = useState(false);
  const attendu = accepted[0] ?? "";
  const propre = saisie.trim();

  function verifier() {
    if (propre.length === 0) return;

    onValider();

    // Juste : rien à juger, on note et on enchaîne. C'est tout l'intérêt du
    // format — la personne n'a pas à s'auto-évaluer sur ce qu'elle a trouvé.
    if (reponseAcceptee(propre, accepted)) {
      onJuger("GOOD");
      return;
    }

    setRate(true);
  }

  if (rate) {
    return (
      <div className="mt-pas-8">
        <PhraseTrouee phrase={sentence} comble={attendu} />

        <p className="mt-pas-6 text-petit text-stone-500">
          Tu as écrit <span className="font-mono text-stone-900">{propre}</span>.
        </p>

        <div className="gap-pas-2 mt-pas-3 flex flex-wrap">
          <Button
            type="button"
            variant="outline"
            disabled={enCours}
            onClick={() => onJuger("HARD")}
          >
            Je l&apos;avais
          </Button>
          <Button type="button" disabled={enCours} onClick={() => onJuger("AGAIN")}>
            Continuer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-pas-8">
      <PhraseTrouee phrase={sentence} comble={propre.length > 0 ? propre : null} />

      <form
        className="gap-pas-3 mt-pas-6 flex flex-col sm:flex-row sm:items-end"
        onSubmit={(evenement) => {
          evenement.preventDefault();
          verifier();
        }}
      >
        <div className="flex-1">
          <label htmlFor="trou" className="text-petit block text-stone-500">
            Le terme qui manque
          </label>
          <Input
            id="trou"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            className="mt-pas-2"
            value={saisie}
            onChange={(evenement) => setSaisie(evenement.target.value)}
          />
        </div>

        <Button type="submit" disabled={enCours || propre.length === 0}>
          Vérifier
        </Button>
      </form>
    </div>
  );
}
