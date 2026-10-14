"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";
import { signOut } from "@/lib/auth/client";

/**
 * La déconnexion, et le rafraîchissement qui doit la suivre.
 *
 * `router.push` seul resert la landing gardée dans le cache du routeur, encore
 * rendue connectée. `router.refresh` redemande le rendu au serveur, qui n'a
 * plus de session ; après le `push`, car c'est la page d'arrivée qu'il faut
 * rafraîchir.
 */
export function BoutonDeconnexion() {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const t = useTranslations("compte.connexion.deconnexion");

  return (
    <div>
      <Button
        variant="outline"
        disabled={enCours}
        onClick={() => {
          setEnCours(true);
          void signOut().then(
            () => {
              router.push(ROUTES.accueil);
              router.refresh();
            },
            (erreur: unknown) => {
              console.error("La déconnexion a échoué.", erreur);
              setEnCours(false);
            },
          );
        }}
      >
        {enCours ? t("enCours") : t("bouton")}
      </Button>
    </div>
  );
}
