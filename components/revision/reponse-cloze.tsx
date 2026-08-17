"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { reponseAcceptee } from "@/lib/domain/reponse-cloze";
import type { ReviewRating } from "@/lib/db/types";

/**
 * Le texte à trou.
 *
 * La phrase est en titre — c'est l'énoncé, la carte s'en charge. Ici on ne pose
 * que ce qu'il faut pour la combler : ce qu'on attend dans le trou, un champ, et
 * la vérification.
 *
 * Cette vérification est locale et instantanée : les formes acceptées ont été
 * écrites en même temps que la question, il n'y a rien à demander à personne.
 * C'est le seul format qui fait produire une réponse sans faire attendre un
 * jugement.
 *
 * Quand la saisie ne correspond pas, on montre le terme attendu à côté de ce qui
 * a été écrit — les deux se comparent d'un regard — et on laisse dire « je
 * l'avais » : on écrit parfois un synonyme que la liste ne porte pas. C'est le
 * seul jugement demandé sur ce format, et seulement dans ce cas : une bonne
 * réponse, elle, n'est jamais soumise à discussion.
 */
export function ReponseCloze({
  accepted,
  enCours,
  onValider,
  onJuger,
}: {
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
      <div className="mt-pas-12">
        <p className="text-corps text-stone-900">
          Le terme était <span className="font-mono font-medium">{attendu}</span>.
        </p>
        <p className="mt-pas-2 text-corps text-stone-500">
          Tu as écrit <span className="font-mono text-stone-900">{propre}</span>.
        </p>

        {/* Deux issues nommées pareil que la graduation des formats ouverts :
            c'est la même question posée en deux boutons. « Continuer » ne disait
            pas ce qu'il enregistrait. */}
        <div className="gap-pas-2 mt-pas-8 flex flex-wrap">
          <Button
            type="button"
            variant="outline"
            disabled={enCours}
            onClick={() => onJuger("HARD")}
          >
            Je l&apos;avais
          </Button>
          <Button type="button" disabled={enCours} onClick={() => onJuger("AGAIN")}>
            Je ne l&apos;avais pas
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="mt-pas-12"
      onSubmit={(evenement) => {
        evenement.preventDefault();
        verifier();
      }}
    >
      {/* La consigne est ce qu'on demande, pas une légende du champ : elle porte
          le poids du corps, comme « Où en étais-tu ? » sur les autres formats. */}
      <label htmlFor="trou" className="text-corps block text-stone-900">
        Complète avec le terme qui manque
      </label>

      <div className="gap-pas-3 mt-pas-3 flex flex-col sm:flex-row sm:items-center">
        <Input
          id="trou"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          className="flex-1"
          value={saisie}
          onChange={(evenement) => setSaisie(evenement.target.value)}
        />

        <Button type="submit" disabled={enCours || propre.length === 0}>
          Vérifier
        </Button>
      </div>
    </form>
  );
}
