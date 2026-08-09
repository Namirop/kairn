"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Champ } from "@/components/compte/champ";
import { Button } from "@/components/ui/button";
import { signUp } from "@/lib/auth/client";

const LONGUEUR_MINIMALE = 12;

/**
 * Inscription. Trois champs de poids égal : sur un formulaire d'entrée, tout
 * est requis, il n'y a pas de champ héros à fabriquer.
 *
 * Le fuseau détecté par le navigateur part en en-tête avec la création du
 * compte : c'est l'unique envoi, les réglages seront créés avec la bonne valeur.
 */
export function FormulaireInscription({ suite }: { suite: string }) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function envoyer(donnees: FormData) {
    const nom = String(donnees.get("nom") ?? "").trim();
    const email = String(donnees.get("email") ?? "").trim();
    const motDePasse = String(donnees.get("motDePasse") ?? "");

    if (!nom || !email) {
      setErreur("Renseigne ton nom et ton adresse.");
      return;
    }

    if (motDePasse.length < LONGUEUR_MINIMALE) {
      setErreur(`Le mot de passe fait au moins ${LONGUEUR_MINIMALE} caractères.`);
      return;
    }

    setEnCours(true);
    setErreur(null);

    const { error } = await signUp.email(
      { name: nom, email, password: motDePasse },
      {
        headers: {
          "x-cairn-timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      },
    );

    if (error) {
      setErreur(
        error.status === 422
          ? "Un compte existe déjà avec cette adresse."
          : "La création du compte n'a pas abouti. Réessaie.",
      );
      setEnCours(false);
      return;
    }

    router.push(suite);
    router.refresh();
  }

  return (
    <form action={envoyer} noValidate className="gap-pas-2 flex flex-col">
      <Champ id="nom" name="nom" intitule="Nom" autoComplete="name" autoFocus />
      <Champ id="email" name="email" type="email" intitule="Adresse email" autoComplete="email" />
      <Champ
        id="motDePasse"
        name="motDePasse"
        type="password"
        intitule={`Mot de passe — ${LONGUEUR_MINIMALE} caractères au moins`}
        autoComplete="new-password"
      />

      <p className="text-petit text-alerte min-h-4" role="alert">
        {erreur}
      </p>

      <Button type="submit" size="lg" disabled={enCours} className="mt-pas-2 w-full">
        {enCours ? "Création…" : "Créer mon compte"}
      </Button>
    </form>
  );
}
