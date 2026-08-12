"use client";

import { useState } from "react";
import { signalerAction } from "@/app/(app)/reviser/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { MotifDeSignalement } from "@/lib/db/types";

/**
 * Dire qu'une question ne va pas.
 *
 * Un geste, pas un formulaire. Le motif se choisit en un clic et ferme la
 * fenêtre dans le même mouvement : demander de choisir puis de valider ferait
 * renoncer la moitié des gens, et un signalement qu'on n'envoie pas ne dit rien.
 * Le champ libre reste ouvert pour qui veut préciser, et il n'est jamais requis.
 *
 * L'action est discrète et vit sous la carte. Elle doit être trouvable quand on
 * la cherche, et invisible quand on révise — ce n'est pas une note à donner,
 * c'est un défaut à remonter.
 */

const MOTIFS: { valeur: MotifDeSignalement; libelle: string; aide: string }[] = [
  {
    valeur: "INCOMPREHENSIBLE",
    libelle: "Je ne comprends pas la question",
    aide: "Mal tournée, ambiguë, ou il manque un bout.",
  },
  {
    valeur: "FAUSSE",
    libelle: "La réponse attendue est fausse",
    aide: "Ce qu'elle affirme est inexact.",
  },
  {
    valeur: "HORS_SUJET",
    libelle: "Sans rapport avec ce que j'ai déposé",
    aide: "Elle porte sur autre chose que mon texte.",
  },
  {
    valeur: "TROP_FACILE",
    libelle: "Trop facile pour mesurer quoi que ce soit",
    aide: "La réponse est dans la question.",
  },
];

export function SignalerLaQuestion({ variantId }: { variantId: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [commentaire, setCommentaire] = useState("");
  const [envoi, setEnvoi] = useState<MotifDeSignalement | null>(null);
  const [remercie, setRemercie] = useState(false);

  async function signaler(motif: MotifDeSignalement) {
    setEnvoi(motif);

    const parti = await signalerAction({ variantId, motif, commentaire });

    setEnvoi(null);

    if (!parti) return;

    setOuvert(false);
    setRemercie(true);
    setCommentaire("");
  }

  if (remercie) {
    return (
      <p className="text-petit text-stone-500" role="status">
        Signalé. Cette question ne reviendra pas.
      </p>
    );
  }

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger className="text-petit rounded-galet text-stone-500 underline-offset-4 hover:underline focus-visible:underline">
        Signaler cette question
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Qu&apos;est-ce qui ne va pas ?</DialogTitle>
          <DialogDescription>
            Elle ne te sera plus reposée. Personne ne la réécrit tout de suite : c&apos;est lu, puis
            corrigé à la source.
          </DialogDescription>
        </DialogHeader>

        <ul className="gap-pas-2 mt-pas-4 flex flex-col">
          {MOTIFS.map((motif) => (
            <li key={motif.valeur}>
              <button
                type="button"
                disabled={envoi !== null}
                onClick={() => void signaler(motif.valeur)}
                className="rounded-galet px-pas-3 py-pas-3 -mx-pas-3 block w-full text-left transition-colors hover:bg-stone-100 focus-visible:bg-stone-100 disabled:opacity-50"
              >
                <span className="text-corps block text-stone-900">{motif.libelle}</span>
                <span className="text-petit block text-stone-500">{motif.aide}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-pas-6">
          <label htmlFor="signalement-precision" className="text-petit block text-stone-500">
            Préciser, si tu veux
          </label>
          <textarea
            id="signalement-precision"
            value={commentaire}
            onChange={(evenement) => setCommentaire(evenement.target.value)}
            rows={2}
            maxLength={500}
            className="rounded-galet mt-pas-2 px-pas-3 py-pas-2 text-petit focus-visible:border-lichen w-full resize-none border border-stone-300 bg-transparent text-stone-900 outline-none"
          />
        </div>

        <div className="mt-pas-4 flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={() => setOuvert(false)}>
            Annuler
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
