"use client";

import { useEffect } from "react";
import Link from "next/link";
import { EcranErreur } from "@/components/etats/ecran-erreur";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/auth/routes";

export default function Erreur({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // L'empreinte suffit à retrouver la trace côté serveur ; rien du contenu de
    // l'utilisateur ne part dans les journaux.
    console.error(`Erreur d'affichage${error.digest ? ` — ${error.digest}` : ""}`);
  }, [error.digest]);

  return (
    <EcranErreur
      code={error.digest ? `Incident ${error.digest.slice(0, 8)}` : "Incident"}
      titre="Cet écran n'a pas pu s'afficher"
      explication="Le problème vient de notre côté, pas de ce que tu as fait. Réessaie : si l'écran revient, tes données n'ont pas bougé."
      actions={
        <>
          <Button onClick={reset}>Réessayer</Button>
          <Button asChild variant="outline">
            <Link href={ROUTES.aujourdhui}>Retourner à Aujourd&apos;hui</Link>
          </Button>
        </>
      }
    />
  );
}
