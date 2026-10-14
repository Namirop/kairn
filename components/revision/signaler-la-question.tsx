"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { signalerAction } from "@/app/(app)/reviser/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { MotifDeSignalement } from "@/lib/db/types";

/**
 * Dire qu'une question ne va pas.
 *
 * Le motif se choisit, puis s'envoie : deux gestes, pour laisser le temps de
 * préciser et de se relire. L'action est discrète, sous la carte : ce n'est pas
 * une note à donner, c'est un défaut à remonter.
 */

/** L'ordre des motifs ; leurs mots vivent dans l'espace `revision.signalement`. */
const MOTIFS: MotifDeSignalement[] = ["INCOMPREHENSIBLE", "FAUSSE", "HORS_SUJET", "TROP_FACILE"];

export function SignalerLaQuestion({ variantId }: { variantId: string }) {
  const t = useTranslations("revision.signalement");
  const [ouvert, setOuvert] = useState(false);
  const [motif, setMotif] = useState<MotifDeSignalement | null>(null);
  const [commentaire, setCommentaire] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [remercie, setRemercie] = useState(false);

  async function signaler() {
    if (motif === null) return;

    setEnvoi(true);

    const parti = await signalerAction({ variantId, motif, commentaire });

    setEnvoi(false);

    if (!parti) return;

    setOuvert(false);
    setRemercie(true);
    setMotif(null);
    setCommentaire("");
  }

  if (remercie) {
    return (
      <p className="text-petit text-stone-500" role="status">
        {t("merci")}
      </p>
    );
  }

  return (
    <Dialog
      open={ouvert}
      onOpenChange={(etat) => {
        setOuvert(etat);
        // Refermer sans envoyer efface le choix : rouvrir repose la question à
        // neuf.
        if (!etat) setMotif(null);
      }}
    >
      <DialogTrigger className="text-petit rounded-galet text-stone-500 underline-offset-4 hover:underline focus-visible:underline">
        {t("declencheur")}
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("titre")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {/* Des boutons radio natifs, dessinés : les flèches du clavier
            circulent, et le focus du champ masqué se voit sur son étiquette.

            Arrondi de carte et non pilule : sur un motif de deux lignes, la
            pilule rentrerait là où passe le texte. Pas de marge propre aux
            blocs, la grille du dialogue les espace déjà : la fenêtre doit tenir
            dans le pli d'un téléphone, bouton « Envoyer » compris. */}
        <ul className="gap-pas-1 flex flex-col">
          {MOTIFS.map((choix) => (
            <li key={choix}>
              <label
                className={`rounded-carte px-pas-4 py-pas-3 has-[:focus-visible]:border-accent block cursor-pointer border transition-colors ${
                  motif === choix
                    ? "border-accent bg-accent/10"
                    : "border-transparent hover:bg-stone-100"
                }`}
              >
                <input
                  type="radio"
                  name="motif-de-signalement"
                  value={choix}
                  checked={motif === choix}
                  onChange={() => setMotif(choix)}
                  disabled={envoi}
                  className="sr-only"
                />
                <span className="text-corps block text-stone-900">
                  {t(`motifs.${choix}.libelle`)}
                </span>
                <span className="mt-pas-1 text-petit block text-stone-500">
                  {t(`motifs.${choix}.aide`)}
                </span>
              </label>
            </li>
          ))}
        </ul>

        <div>
          <label htmlFor="signalement-precision" className="text-petit block text-stone-500">
            {t("preciser")}
          </label>
          <textarea
            id="signalement-precision"
            value={commentaire}
            onChange={(evenement) => setCommentaire(evenement.target.value)}
            rows={2}
            maxLength={500}
            disabled={envoi}
            // 16 px sur mobile : en deçà, Safari zoome à la mise au point.
            className="rounded-champ mt-pas-2 px-pas-3 py-pas-2 md:text-petit focus-visible:border-accent w-full resize-none border border-stone-300 bg-transparent text-base text-stone-900 outline-none disabled:opacity-45"
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" disabled={envoi} onClick={() => setOuvert(false)}>
            {t("annuler")}
          </Button>
          <Button type="button" disabled={motif === null || envoi} onClick={() => void signaler()}>
            {envoi ? t("envoi") : t("envoyer")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
