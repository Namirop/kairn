"use client";

import { useActionState } from "react";
import { rejoindreListeDattenteAction } from "@/app/(app)/depots/actions";
import { Button } from "@/components/ui/button";

/**
 * Se signaler quand la limite gêne et qu'aucune offre n'y répond.
 *
 * C'est ce qu'on propose à qui paie déjà, ou à qui bute sur le nombre de
 * dépôts : dans les deux cas il n'y a rien à vendre, et la seule suite utile est
 * de savoir que quelqu'un est gêné. Un compte gratuit arrêté par les concepts,
 * lui, a une réponse — il ne voit pas ce bloc.
 *
 * **Le bouton nomme la limite.** Il disait « quand la limite bougera » : deux
 * plafonds cohabitent sur cet écran, et le bouton ne disait pas lequel il
 * visait. Un bouton dit ce qu'il fait, sans que l'on ait à relire la phrase
 * au-dessus pour le deviner.
 *
 * Le seul morceau client de cet écran, isolé pour ça.
 */

const NOM_DE_LA_LIMITE = { concepts: "concepts", depots: "dépôts" } as const;

export function ListeDattente({
  inscrit,
  motif,
}: {
  inscrit: boolean;
  motif: "concepts" | "depots";
}) {
  const [fait, rejoindre, enCours] = useActionState(async () => {
    await rejoindreListeDattenteAction();
    return true;
  }, inscrit);

  const limite = `limite de ${NOM_DE_LA_LIMITE[motif]}`;

  if (fait) {
    return (
      <p className="text-petit text-pretty text-stone-500">
        C&apos;est noté. Tu seras prévenu si la {limite} change.
      </p>
    );
  }

  return (
    <form action={rejoindre}>
      <Button type="submit" variant="outline" size="sm" disabled={enCours}>
        Me prévenir si la {limite} change
      </Button>
    </form>
  );
}
