"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TexteATrou } from "@/components/revision/use-suite-de-questions";
import type { ReviewRating } from "@/lib/db/types";
import { LONGUEUR_MAX_SAISIE } from "@/lib/domain/reponse-cloze";

/**
 * Le texte à trou.
 *
 * La phrase est en titre — c'est l'énoncé, la carte s'en charge — et son trou se
 * remplit à la frappe. Ici on ne pose que ce qu'il faut pour le combler : la
 * consigne, un champ, la vérification.
 *
 * Cette vérification est locale et instantanée : les formes acceptées ont été
 * écrites en même temps que la question, il n'y a rien à demander à personne.
 * C'est le seul format qui fait produire une réponse sans faire attendre un
 * jugement.
 *
 * Juste, l'écran le dit et attend un clic. Enchaîner sans rien montrer était le
 * geste le plus rapide et le plus inquiétant du produit : la question suivante
 * s'affichait, et rien ne disait si la réponse avait été lue, comptée, ou même
 * juste. Le passage, lui, est déjà écrit — la confirmation ne retient rien.
 *
 * À côté, on montre le terme attendu dans la phrase et on laisse dire « je
 * l'avais » : on écrit parfois un synonyme que la liste ne porte pas. C'est le
 * seul jugement demandé sur ce format, et seulement dans ce cas.
 */
export function ReponseCloze({
  trou,
  enCours,
  dernier,
  onVerifier,
  onJuger,
}: {
  trou: TexteATrou;
  enCours: boolean;
  dernier: boolean;
  /** Compare la saisie aux formes acceptées et fige le chronomètre. */
  onVerifier: () => void;
  onJuger: (note: ReviewRating) => void;
}) {
  const propre = trou.saisie.trim();

  if (trou.verdict === "JUSTE") {
    return (
      <div className="mt-pas-scene">
        {/* Un constat, pas un compliment : la récompense est l'espacement qui
            s'allonge, et le terme qui vient de se poser dans la phrase. */}
        <p className="text-corps text-stone-900">C&apos;est le terme attendu.</p>

        <div className="mt-pas-6">
          <Button type="button" disabled={enCours} onClick={() => onJuger("GOOD")}>
            {dernier ? "Terminer" : "Continuer"}
          </Button>
        </div>
      </div>
    );
  }

  if (trou.verdict === "RATE") {
    return (
      <div className="mt-pas-scene">
        <p className="text-corps text-stone-500">
          Tu as écrit <span className="font-mono text-stone-900">{propre}</span>.
        </p>

        {/* Deux issues nommées comme la graduation des formats ouverts : c'est la
            même question posée en deux boutons. « Continuer » ne disait pas ce
            qu'il enregistrait. */}
        <div className="gap-pas-2 mt-pas-6 flex flex-wrap">
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
      className="mt-pas-scene"
      onSubmit={(evenement) => {
        evenement.preventDefault();
        onVerifier();
      }}
    >
      {/* La consigne est ce qu'on demande, pas une légende du champ : elle porte
          le poids du corps, comme « Où en étais-tu ? » sur les autres formats. */}
      <label htmlFor="trou" className="text-corps block text-stone-900">
        Complète avec le terme qui manque
      </label>

      <div className="gap-pas-3 mt-pas-3 flex max-w-xl flex-col sm:flex-row sm:items-center">
        <Input
          id="trou"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={LONGUEUR_MAX_SAISIE}
          /* `flex-1` seul écrasait le champ sur téléphone. La rangée passe en
             colonne sous `sm`, et dans une colonne c'est la **hauteur** que
             `flex-1` gouverne : le champ tombait à une vingtaine de pixels,
             deux fois moins qu'un bouton, pour le geste central de ce format.
             Il prend la largeur en colonne, la place restante en rangée.

             Et il monte à quarante-huit pixels sur téléphone, comme le bouton
             qui le suit : c'est le seul champ de l'écran, et la seule chose
             qu'on ait à faire. */
          className="w-full max-sm:h-12 sm:flex-1"
          value={trou.saisie}
          onChange={(evenement) => trou.saisir(evenement.target.value)}
        />

        <Button type="submit" disabled={enCours || propre.length === 0} className="max-sm:h-12">
          Vérifier
        </Button>
      </div>
    </form>
  );
}
