"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Champ } from "@/components/compte/champ";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth/client";

/**
 * Connexion. Deux champs de même poids, validation maison — jamais la bulle
 * native du navigateur, qui ne suit ni la langue ni la direction visuelle.
 */
export function FormulaireConnexion({ suite }: { suite: string }) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function envoyer(donnees: FormData) {
    const email = String(donnees.get("email") ?? "").trim();
    const motDePasse = String(donnees.get("motDePasse") ?? "");

    if (!email || !motDePasse) {
      setErreur("Renseigne ton adresse et ton mot de passe.");
      return;
    }

    setEnCours(true);
    setErreur(null);

    const { error } = await signIn.email({ email, password: motDePasse });

    if (error) {
      setErreur("Adresse ou mot de passe incorrect. Réessaie.");
      setEnCours(false);
      return;
    }

    router.push(suite);
    router.refresh();
  }

  return (
    <form action={envoyer} noValidate className="gap-pas-2 flex flex-col">
      <Champ
        id="email"
        name="email"
        type="email"
        intitule="Adresse email"
        autoComplete="email"
        autoFocus
      />
      <Champ
        id="motDePasse"
        name="motDePasse"
        type="password"
        intitule="Mot de passe"
        autoComplete="current-password"
      />

      <p className="text-petit text-alerte min-h-4" role="alert">
        {erreur}
      </p>

      <Button type="submit" size="lg" disabled={enCours} className="mt-pas-2 w-full">
        {enCours ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}
