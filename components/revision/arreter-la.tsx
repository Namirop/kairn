"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { quitterLaSessionAction } from "@/app/(app)/reviser/actions";
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
  rafraichirLeTableau = false,
}: {
  titre: string;
  /** Ce qu'il advient de ce qu'on laisse. Une phrase, écrite par l'écran. */
  consequence: string;
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
  const [ouvert, setOuvert] = useState(false);
  const [sortie, setSortie] = useState(false);

  async function partir() {
    setSortie(true);

    // Attendu avant de naviguer : c'est l'attente qui garantit que la page
    // d'arrivée sera relue, et non resservie telle qu'on l'avait laissée.
    if (rafraichirLeTableau) await quitterLaSessionAction();

    router.push(ROUTES.aujourdhui);
  }

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger className="text-petit rounded-galet shrink-0 text-stone-900 underline-offset-4 hover:underline focus-visible:underline">
        Arrêter là
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titre}</DialogTitle>
          <DialogDescription>{consequence}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-pas-4">
          <Button type="button" variant="ghost" disabled={sortie} onClick={() => setOuvert(false)}>
            Reprendre
          </Button>
          <Button type="button" disabled={sortie} onClick={() => void partir()}>
            Arrêter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
