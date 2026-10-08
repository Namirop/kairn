"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { adresseDuVisiteur, lireLaVisite, poserLaVisite } from "@/lib/auth/visite";
import { deposerSansCompte } from "@/lib/depots/deposer-sans-compte";
import { lireLEssaiEnCours, type AvancementDeLEssai } from "@/lib/depots/essai-en-cours";

/**
 * Le geste d'essai, depuis la landing.
 *
 * Il n'y a pas de session à exiger : c'est tout l'intérêt. Ce qui la remplace,
 * ce sont les deux verrous de `deposerSansCompte` — un dépôt par cookie de
 * visite, une poignée par empreinte d'adresse — et le fait que la chaîne
 * s'arrête à l'extraction.
 *
 * Une session est en revanche un motif de **refus**. Un compte connecté qui
 * passerait par ici verrait son texte rattaché à un cookie plutôt qu'à lui, et
 * effacé sept jours plus tard par le cron de nettoyage : une perte silencieuse,
 * sur un geste qu'il a fait correctement. L'écran ne propose plus ce champ à qui
 * est entré, et l'action ne compte pas là-dessus pour autant.
 */

/**
 * `inputId` est ce qui identifie un essai, et pas `sessionId`.
 *
 * Un second essai réutilise la même visite : la session est donc la même chaîne
 * d'un essai à l'autre, et l'écran n'avait aucun moyen de savoir qu'il venait
 * d'en partir un nouveau. L'identifiant du dépôt, lui, change à chaque fois —
 * c'est celui que le serveur connaît, et c'est la seule identité qui ne mente
 * pas.
 */
export type EtatEssai = { erreur?: string; sessionId?: string; inputId?: string };

export async function essayerAction(_precedent: EtatEssai, donnees: FormData): Promise<EtatEssai> {
  if (await getCurrentUser()) redirect(`${ROUTES.depots}/nouveau`);

  const texte = (donnees.get("texte") ?? "").toString();
  // Les refus se disent dans la langue de la requête, celle de l'écran qui les montre.
  const resultat = await deposerSansCompte(
    texte,
    await adresseDuVisiteur(),
    await lireLaVisite(),
    await getTranslations("depots.refus"),
  );

  if (!resultat.ok) return { erreur: resultat.motif };

  await poserLaVisite(resultat.sessionId);

  return { sessionId: resultat.sessionId, inputId: resultat.inputId };
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
