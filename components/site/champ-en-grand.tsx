"use client";

import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

/**
 * Le champ de dépôt, en grand, pour relire un long texte : le champ de la bande
 * a une hauteur fixe pour que coller un article ne pousse pas le bouton hors de
 * l'écran.
 *
 * Les deux champs partagent la même valeur, donc fermer ne valide ni n'annule
 * rien. Seul le champ de la bande porte le `name` : la fenêtre vit dans un
 * portail, hors du `form`.
 *
 * Le focus reste au début du texte, où Radix le pose : on vient relire, et un
 * curseur en fin de texte ferait défiler la zone jusqu'au dernier mot.
 */
export function ChampEnGrand({
  ouvert,
  surFermeture,
  invite,
  texte,
  surTexte,
}: {
  ouvert: boolean;
  surFermeture: () => void;
  invite: string;
  texte: string;
  surTexte: (valeur: string) => void;
}) {
  const t = useTranslations("site.essai.champ");

  return (
    <Dialog
      open={ouvert}
      onOpenChange={(reste) => {
        if (!reste) surFermeture();
      }}
    >
      <DialogContent className="gap-pas-3 max-w-3xl">
        <DialogTitle className="text-mono pr-pas-8 font-mono tracking-[0.14em] text-stone-500 uppercase">
          {t("intitule")}
        </DialogTitle>

        <DialogDescription className="sr-only">{t("descriptionEnGrand")}</DialogDescription>

        {/* Les mêmes mesures que le creux de la bande : seule la hauteur
            change. */}
        <div className="rounded-t-champ bg-surface-ombre p-pas-4 md:p-pas-6 focus-within:border-accent-profond border-b-2 border-stone-300 transition-colors">
          <textarea
            id="essai-en-grand"
            value={texte}
            onChange={(evenement) => surTexte(evenement.target.value)}
            placeholder={invite}
            className="text-enonce ascenseur-discret h-[clamp(16rem,52svh,34rem)] w-full resize-none overflow-y-auto border-0 bg-transparent leading-[1.35] text-stone-900 outline-none placeholder:text-stone-500 focus-visible:outline-none"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
