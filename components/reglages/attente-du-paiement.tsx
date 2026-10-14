"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * L'écran qui se met à jour tout seul, le temps que le webhook arrive : le
 * retour de Stripe gagne souvent la course, et l'écran resterait à « Gratuit »
 * jusqu'à un rechargement manuel.
 *
 * Quinze essais à deux secondes. Un webhook absent après trente secondes est
 * en incident : on cesse, et on le dit.
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
