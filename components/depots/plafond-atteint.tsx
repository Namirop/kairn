"use client";

import { useActionState } from "react";
import { rejoindreListeDattenteAction } from "@/app/(app)/depots/actions";
import { Button } from "@/components/ui/button";

/**
 * Ce qu'on montre quand la journée est pleine.
 *
 * Ce n'est pas une erreur : l'utilisateur n'a rien fait de mal. L'écran dit ce
 * qui se passe, quand ça se remet à zéro, et ouvre une porte.
 */
export function PlafondAtteint({
  remiseAZero,
  inscrit,
}: {
  remiseAZero: string;
  inscrit: boolean;
}) {
  const [fait, rejoindre, enCours] = useActionState(async () => {
    await rejoindreListeDattenteAction();
    return true;
  }, inscrit);

  return (
    <div className="border-lichen pl-pas-4 gap-pas-3 flex max-w-xl flex-col border-l-2">
      <p className="text-corps text-stone-900">
        Tu as déposé les cinq dépôts de la journée. Le compteur repart {remiseAZero}.
      </p>
      <p className="text-petit text-stone-500">
        Cette limite tient le coût des appels au modèle pendant que Cairn se construit. Si elle te
        gêne, dis-le : c&apos;est le signal qui décidera de la suite.
      </p>

      {fait ? (
        <p className="text-petit text-stone-500">
          C&apos;est noté. Tu seras prévenu quand la limite bougera.
        </p>
      ) : (
        <form action={rejoindre}>
          <Button type="submit" variant="outline" size="sm" disabled={enCours}>
            Me prévenir quand la limite bougera
          </Button>
        </form>
      )}
    </div>
  );
}
