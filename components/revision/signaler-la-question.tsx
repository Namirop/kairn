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
 * Le motif se choisit, puis s'envoie. Il partait autrefois au clic, en un seul
 * geste, pour ne pas décourager par un formulaire — sauf que la fenêtre
 * proposait aussi de préciser, et se fermait avant qu'on ait pu écrire un mot.
 * Le champ libre était donc offert et inatteignable, et un signalement mal visé
 * ne se rattrapait pas. Choisir et envoyer sont maintenant deux gestes : le
 * second est à un clic, et entre les deux on peut se relire.
 *
 * L'action est discrète et vit sous la carte. Elle doit être trouvable quand on
 * la cherche, et invisible quand on révise — ce n'est pas une note à donner,
 * c'est un défaut à remonter.
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
        // Refermer sans envoyer efface le choix : rouvrir plus tard doit poser
        // la question à neuf, pas retrouver un motif à demi sélectionné.
        if (!etat) setMotif(null);
      }}
    >
      {/* Ce que la personne pense au moment où elle clique, pas ce que le
          système fait de son clic. « Signaler » était tiède, et tiède veut dire
          qu'on ne clique pas. */}
      <DialogTrigger className="text-petit rounded-galet text-stone-500 underline-offset-4 hover:underline focus-visible:underline">
        {t("declencheur")}
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("titre")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {/* Des boutons radio natifs, dessinés : la sélection se voit, les flèches
            du clavier circulent, et le champ masqué garde le focus visible sur
            l'étiquette qui l'accompagne.

            **Un arrondi de carte, pas de pilule.** Chaque motif tient sur deux
            lignes — son intitulé et ce qu'il veut dire — et la pilule arrondit à
            la moitié de la hauteur : sur un bloc de quatre-vingt-dix pixels, le
            bord rentrait de quarante-cinq à l'endroit exact où le texte passe.
            Le motif le plus long touchait presque son cadre. Dans l'échelle des
            formes, c'est d'ailleurs une carte : un objet posé qu'on choisit, pas
            un geste qu'on déclenche.

            **Et la fenêtre entière tient dans le pli d'un téléphone.** Elle
            en débordait d'une trentaine de pixels, et le bas — donc « Envoyer »
            — était coupé. Trois hauteurs y passaient sans rien porter : la
            grille du dialogue espace déjà ses blocs de quatre pas, et chacun
            reposait par-dessus une marge de quatre pas à lui ; le rembourrage
            des motifs valait celui d'une carte alors qu'ils sont une liste. */}
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
