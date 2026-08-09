"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";
import { signOut } from "@/lib/auth/client";

export function BoutonDeconnexion() {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);

  return (
    <div>
      <Button
        variant="outline"
        disabled={enCours}
        onClick={() => {
          setEnCours(true);
          void signOut().then(
            () => router.push(ROUTES.accueil),
            (erreur: unknown) => {
              console.error("La déconnexion a échoué.", erreur);
              setEnCours(false);
            },
          );
        }}
      >
        {enCours ? "Déconnexion…" : "Se déconnecter"}
      </Button>
    </div>
  );
}
