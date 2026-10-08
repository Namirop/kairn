"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * L'écran qui se met à jour tout seul, le temps que le webhook arrive.
 *
 * **Le manque qu'il comble était de dire d'attendre sans que rien ne bouge.**
 * Le retour de Stripe et l'arrivée du webhook sont deux chemins distincts, et le
 * navigateur gagne souvent la course : quelqu'un qui vient de payer lisait
 * « quelques secondes », puis rien — l'écran restait à « Gratuit » jusqu'à ce
 * qu'il pense à recharger. C'est le moment du parcours où l'on est le plus
 * inquiet, et c'était le seul où le produit ne faisait rien.
 *
 * Deux secondes entre deux essais, une trentaine de secondes en tout. Au-delà,
 * on cesse et on le dit : un webhook qui n'est pas arrivé en trente secondes est
 * en incident, et continuer à interroger le serveur n'y changerait rien.
 */

const CADENCE_MS = 2000;
const ESSAIS = 15;

export function AttenteDuPaiement() {
  const router = useRouter();
  const [restants, setRestants] = useState(ESSAIS);
  const t = useTranslations("compte.offre");

  useEffect(() => {
    if (restants <= 0) return;

    const minuteur = setTimeout(() => {
      // `refresh` rejoue le composant serveur : dès que le webhook a écrit, le
      // plan change et cet écran d'attente disparaît de lui-même.
      router.refresh();
      setRestants((reste) => reste - 1);
    }, CADENCE_MS);

    return () => clearTimeout(minuteur);
  }, [restants, router]);

  if (restants > 0) return null;

  return (
    <p className="text-petit text-pretty text-stone-500" role="status">
      {t("attente")}
    </p>
  );
}
