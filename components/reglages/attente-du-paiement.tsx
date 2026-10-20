"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Le retour de Stripe devance souvent le webhook : sans relecture, l'écran
 * resterait à « Gratuit ». Un webhook absent après trente secondes est en
 * incident : on cesse, et on le dit.
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
      // Dès que le webhook a écrit, le serveur ne rend plus cette attente.
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
