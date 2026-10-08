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
 * La porte de sortie d'un passage de questions, et la question qu'elle pose
 * avant de s'ouvrir.
 *
 * Rien n'est perdu en sortant — chaque passage est écrit dès qu'il est donné —
 * et c'est pour cette raison que la sortie était immédiate. L'argument tenait
 * pour les données, pas pour le geste : sur un téléphone, ce lien est en haut à
 * droite, à l'endroit exact où le pouce se pose en remontant l'écran, et il
 * emportait une session en cours sans un mot. On confirme donc, non pas parce
 * qu'il y a un risque, mais parce qu'on peut le toucher sans le vouloir.
 *
 * La question dit ce qu'on quitte, et la réponse rassurante est écrite dans la
 * fenêtre plutôt que devinée : « le reste revient plus tard » est précisément ce
 * qu'on se demande au moment de partir.
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
   * Ce qui doit être écrit avant de partir, quand il reste quelque chose.
   *
   * Une réponse est parfois sous les yeux sans avoir été notée : c'est au mode
   * de dire ce qu'il en fait. La porte, elle, se contente de l'attendre — et de
   * l'attendre vraiment, sinon la navigation part avec la requête en vol.
   */
  avantDeSortir?: () => Promise<void>;
  /**
   * Une session a déplacé des échéances : le tableau doit les relire.
   *
   * Sans ça, le compte de concepts dus restait celui d'avant la session — le
   * client resservait la page qu'il avait déjà, et il fallait recharger pour
   * voir le travail qu'on venait de faire. Un entraînement ne touche à rien et
   * n'a donc rien à faire relire.
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
      {/* Le rembourrage lui donne la cible qu'une ligne de texte n'a pas : sur
          téléphone, cette porte est seule en haut à droite d'un écran qui n'a
          plus d'en-tête au-dessus, et il n'y a rien à côté d'elle à toucher par
          erreur. La marge négative la ramène sur l'alignement de la colonne. */}
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
