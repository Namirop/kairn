"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import {
  confirmerConcept,
  desarchiverConcept,
  modifierConcept,
  supprimerConcept,
} from "@/lib/db/concepts";
import { inscrireEnListeDattente } from "@/lib/db/quota-depots";
import { deposer, SIGNES_MAXIMUM } from "@/lib/depots/deposer";
import { soumettreLotsEnAttente } from "@/lib/jobs/questions";

/**
 * Les gestes de l'ingestion.
 *
 * Chacun vérifie la session puis la propriété de la ressource : l'identifiant
 * de l'utilisateur vient de la session, jamais du formulaire. Une ressource qui
 * n'est pas à lui n'est pas trouvée, donc pas touchée.
 */

export type EtatDepot = { erreur?: string; quota?: boolean };

async function utilisateurOuRefus(): Promise<string> {
  const utilisateur = await getCurrentUser();

  if (!utilisateur) redirect(ROUTES.connexion);

  return utilisateur.id;
}

export async function deposerAction(_precedent: EtatDepot, donnees: FormData): Promise<EtatDepot> {
  const userId = await utilisateurOuRefus();
  const resultat = await deposer(userId, donnees);

  if (!resultat.ok) {
    return { erreur: resultat.motif, quota: resultat.quota };
  }

  revalidatePath(ROUTES.depots);
  redirect(ROUTES.depots);
}

export async function modifierConceptAction(donnees: FormData): Promise<void> {
  const userId = await utilisateurOuRefus();
  const atomId = (donnees.get("atomId") ?? "").toString();
  const texte = (donnees.get("concept") ?? "").toString().trim();

  if (texte.length < 20 || texte.length > SIGNES_MAXIMUM) return;

  if (await modifierConcept(atomId, userId, texte)) {
    await soumettreLotsEnAttente();
    revalidatePath(`${ROUTES.depots}/${(donnees.get("inputId") ?? "").toString()}`);
  }
}

export async function confirmerConceptAction(donnees: FormData): Promise<void> {
  const userId = await utilisateurOuRefus();

  if (await confirmerConcept((donnees.get("atomId") ?? "").toString(), userId)) {
    await soumettreLotsEnAttente();
    revalidatePath(`${ROUTES.depots}/${(donnees.get("inputId") ?? "").toString()}`);
  }
}

/**
 * Remet dans le cycle un concept que l'utilisateur en avait sorti.
 *
 * Depuis la page du dépôt, où le concept est déjà listé : c'est là qu'on va le
 * chercher quand on s'aperçoit du geste plus tard.
 */
export async function desarchiverConceptAction(donnees: FormData): Promise<void> {
  const userId = await utilisateurOuRefus();
  const atomId = (donnees.get("atomId") ?? "").toString();

  if (await desarchiverConcept(atomId, userId)) {
    revalidatePath(ROUTES.aujourdhui);
    revalidatePath(`${ROUTES.depots}/${(donnees.get("inputId") ?? "").toString()}`);
  }
}

/**
 * Le même geste, défait dans la session, juste après l'avoir fait.
 *
 * Le mauvais clic le plus probable est celui qu'on vient de faire. Rend un
 * booléen parce que l'appelant est un bouton et non un formulaire : il a besoin
 * de savoir si la bande d'annulation peut disparaître.
 */
export async function annulerMaitriseAction(atomId: string): Promise<boolean> {
  const userId = await utilisateurOuRefus();

  // Aucune revalidation ici, volontairement. Elle rafraîchirait la route
  // courante, donc la session : le serveur recomposerait une autre liste de
  // questions, et l'écran changerait de question sous les doigts en plein
  // parcours. Le tableau de bord est rendu à la demande, il sera juste à la
  // prochaine visite.
  return desarchiverConcept(atomId, userId);
}

export async function supprimerConceptAction(donnees: FormData): Promise<void> {
  const userId = await utilisateurOuRefus();

  if (await supprimerConcept((donnees.get("atomId") ?? "").toString(), userId)) {
    revalidatePath(`${ROUTES.depots}/${(donnees.get("inputId") ?? "").toString()}`);
  }
}

export async function rejoindreListeDattenteAction(): Promise<void> {
  await inscrireEnListeDattente(await utilisateurOuRefus());
  revalidatePath(`${ROUTES.depots}/nouveau`);
}
