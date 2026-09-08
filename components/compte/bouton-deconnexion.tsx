"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";
import { signOut } from "@/lib/auth/client";

/**
 * La déconnexion, et le rafraîchissement qui doit la suivre.
 *
 * `router.push` seul renvoyait sur une landing encore connectée : la page
 * publique est rendue à la demande, mais le routeur en garde la version qu'il a
 * déjà servie dans cet onglet, et il la resert telle quelle. On lisait donc
 * « Aujourd'hui » dans l'en-tête d'un compte qu'on venait de quitter — le
 * produit avait l'air de ne pas avoir compris.
 *
 * `router.refresh` vide ce cache et redemande le rendu au serveur, qui n'a plus
 * de session à lire. Après le `push` et non avant : c'est la page d'arrivée
 * qu'il faut rafraîchir, pas celle qu'on quitte.
 */
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
        {enCours ? "Déconnexion…" : "Se déconnecter"}
      </Button>
    </div>
  );
}
