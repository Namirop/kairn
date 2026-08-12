"use client";

import { Button } from "@/components/ui/button";
import type { ReviewRating } from "@/lib/db/types";

/**
 * Où en était-on, sur une échelle.
 *
 * Les quatre niveaux étaient quatre boutons identiques, posés côte à côte comme
 * quatre choix sans rapport. Or ce n'en est pas : c'est une graduation, de « je
 * ne l'avais pas » à « sans hésiter », et la lire comme telle change ce qu'on
 * répond. Ils occupent donc une seule rangée d'largeurs égales, dans l'ordre de
 * la graduation, avec ses deux bouts nommés sous elle.
 *
 * Aucun n'est mis en avant. Ce serait suggérer une bonne réponse à une question
 * qui n'en a pas — et pousser vers le haut fausserait la planification pour tout
 * le reste de la vie du concept.
 *
 * Sur mobile, deux colonnes plutôt que quatre lignes : l'ordre de lecture reste
 * celui de la graduation, et quatre boutons pleine largeur repousseraient la
 * question hors de l'écran.
 */

/**
 * Les quatre niveaux, dits du point de vue de celui qui se juge.
 *
 * Aucun n'est une note ni un compliment : « J'y étais » constate, « Sans
 * hésiter » constate aussi. La récompense est la progression, pas l'étiquette.
 */
export const NIVEAUX: { note: ReviewRating; libelle: string }[] = [
  { note: "AGAIN", libelle: "Je ne l'avais pas" },
  { note: "HARD", libelle: "Approchant" },
  { note: "GOOD", libelle: "J'y étais" },
  { note: "EASY", libelle: "Sans hésiter" },
];

export function BarreDeNotation({
  enCours,
  onNoter,
}: {
  enCours: boolean;
  onNoter: (note: ReviewRating) => void;
}) {
  return (
    <div>
      {/* La décision de l'écran : elle porte le poids du corps, pas celui d'une
          légende. C'est ce qu'on demande, pas ce qu'on précise. */}
      <p className="text-corps text-stone-900">Où en étais-tu ?</p>

      <div className="gap-pas-2 mt-pas-3 grid grid-cols-2 sm:grid-cols-4">
        {NIVEAUX.map((niveau) => (
          <Button
            key={niveau.note}
            type="button"
            variant="outline"
            disabled={enCours}
            onClick={() => onNoter(niveau.note)}
            className="h-auto w-full py-3 text-center font-normal whitespace-normal"
          >
            {niveau.libelle}
          </Button>
        ))}
      </div>

      {/* Les deux bouts nommés : c'est ce qui fait lire la rangée comme une
          graduation plutôt que comme quatre options. Masqué au lecteur d'écran,
          qui a déjà les libellés dans l'ordre. */}
      <div
        aria-hidden
        className="mt-pas-2 text-mono hidden justify-between font-mono text-stone-500 sm:flex"
      >
        <span>Oublié</span>
        <span>Immédiat</span>
      </div>
    </div>
  );
}
