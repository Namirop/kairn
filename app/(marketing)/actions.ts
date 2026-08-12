"use server";

import { adresseDuVisiteur, lireLaVisite, poserLaVisite } from "@/lib/auth/visite";
import { deposerSansCompte } from "@/lib/depots/deposer-sans-compte";
import { lireLEssaiEnCours, type AvancementDeLEssai } from "@/lib/depots/essai-en-cours";

/**
 * Le geste d'essai, depuis la landing.
 *
 * Il n'y a pas de session à vérifier : c'est tout l'intérêt. Ce qui remplace la
 * vérification, ce sont les deux verrous de `deposerSansCompte` — un dépôt par
 * cookie de visite, une poignée par empreinte d'adresse — et le fait que la
 * chaîne s'arrête à l'extraction.
 */

export type EtatEssai = { erreur?: string; sessionId?: string };

export async function essayerAction(_precedent: EtatEssai, donnees: FormData): Promise<EtatEssai> {
  const texte = (donnees.get("texte") ?? "").toString();
  const resultat = await deposerSansCompte(texte, await adresseDuVisiteur(), await lireLaVisite());

  if (!resultat.ok) return { erreur: resultat.motif };

  await poserLaVisite(resultat.sessionId);

  return { sessionId: resultat.sessionId };
}

/**
 * Où en est l'essai.
 *
 * L'extraction est asynchrone — l'utilisateur n'attend jamais un appel modèle
 * dans une requête — donc l'écran redemande jusqu'à ce que les concepts soient
 * là. C'est le seul endroit du produit qui interroge en boucle, et il ne le fait
 * que quelques secondes.
 */
export async function avancementDeLEssaiAction(): Promise<AvancementDeLEssai | null> {
  return lireLEssaiEnCours();
}
