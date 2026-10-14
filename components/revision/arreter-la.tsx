"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { relireLeTableauAction } from "@/app/(app)/reviser/actions";
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
import { ROUTES } from "@/lib/auth/routes";

/**
 * La porte de sortie d'un passage de questions, avec confirmation. Rien n'est
 * perdu en sortant ; on confirme parce que, sur téléphone, ce lien est là où
 * le pouce se pose en remontant l'écran.
 */
export function ArreterLa({
  titre,
  consequence,
  avantDeSortir,
  rafraichirLeTableau = false,
}: {
  titre: string;
  /** Ce qu'il advient de ce qu'on laisse. Une phrase, écrite par l'écran. */
  consequence: string;
  /**
   * Ce qui doit être écrit avant de partir (une réponse affichée mais pas
   * notée). La porte l'attend, sinon la navigation part avec la requête en vol.
   */
  avantDeSortir?: () => Promise<void>;
  /**
   * Une session a déplacé des échéances : sans relecture, le client resservirait
   * le tableau d'avant. Un entraînement n'a rien à faire relire.
   */
  rafraichirLeTableau?: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("revision.session.sortie");
  const [ouvert, setOuvert] = useState(false);
  const [sortie, setSortie] = useState(false);

  async function partir() {
    setSortie(true);

    // Ce qui reste à écrire part avant tout le reste : la relecture du tableau
    // doit voir ce passage-là, pas l'état d'avant.
    if (avantDeSortir) await avantDeSortir();

    // Attendu avant de naviguer : c'est l'attente qui garantit que la page
    // d'arrivée sera relue, et non resservie telle qu'on l'avait laissée.
    if (rafraichirLeTableau) await relireLeTableauAction();

    router.push(ROUTES.aujourdhui);
  }

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      {/* Le rembourrage donne une cible tactile ; la marge négative la ramène
          sur l'alignement de la colonne. */}
      <DialogTrigger className="text-petit rounded-galet px-pas-2 py-pas-2 -mr-pas-2 -my-pas-2 shrink-0 text-stone-900 underline-offset-4 hover:underline focus-visible:underline">
        {t("arreterLa")}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titre}</DialogTitle>
          <DialogDescription>{consequence}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-pas-4">
          <Button type="button" variant="ghost" disabled={sortie} onClick={() => setOuvert(false)}>
            {t("reprendre")}
          </Button>
          <Button type="button" disabled={sortie} onClick={() => void partir()}>
            {t("arreter")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
