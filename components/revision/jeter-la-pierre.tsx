"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/**
 * Renoncer à une question.
 *
 * Sans sortie, un texte à trou dont le terme ne revient pas n'en a qu'une :
 * inventer une saisie fausse pour pouvoir avancer. Ça écrit un passage
 * mensonger, et ça apprend à tricher avec son propre outil — deux fois pire que
 * de dire qu'on ne sait pas.
 *
 * Le geste reste discret et vit sous la réponse, jamais à côté d'elle :
 * renoncer doit rester moins confortable que chercher. Il disparaît dès qu'une
 * réponse existe — à ce moment-là il n'y a plus à abandonner, il y a à se juger.
 */
export function JeterLaPierre({ enCours, onJeter }: { enCours: boolean; onJeter: () => void }) {
  const t = useTranslations("revision.question");

  return (
    <div className="sortie-de-secours mt-pas-6">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={enCours}
        onClick={onJeter}
        /* Une cible qu'on atteint au doigt. Discret ne veut pas dire petit :
           trente-six pixels de haut se ratent, et rater ce bouton-là veut dire
           taper à côté au moment où l'on renonce.

           Le rembourrage gauche est repris en marge négative : le mot se pose
           alors sur le bord du contenu, aligné avec la consigne et avec l'autre
           sortie, pendant que la cible garde sa taille. Sans ça, deux sorties
           de même rang partent de deux verticales différentes, et la seconde a
           l'air de dépendre de la première. */
        className="max-sm:px-pas-4 -ml-pas-4 max-sm:h-11"
      >
        {t("jeterLaPierre")}
      </Button>
    </div>
  );
}
