"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";
import { signOut } from "@/lib/auth/client";

/**
 * `router.push` seul resert la landing du cache du routeur, encore rendue
 * connectée. `refresh` après le `push` : c'est la page d'arrivée à redemander.
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
