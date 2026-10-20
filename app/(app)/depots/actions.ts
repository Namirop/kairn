"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { ROUTES } from "@/lib/auth/routes";
import { lireLUtilisateur } from "@/lib/auth/session";
import {
  confirmerConcept,
  desarchiverConcept,
  modifierConcept,
  supprimerConcept,
} from "@/lib/db/concepts";
import { lireAvancementDuDepot } from "@/lib/db/depot-detaille";
import { inscrireEnListeDattente } from "@/lib/db/liste-dattente";
import { supprimerDepot } from "@/lib/db/reprise-depot";
import { CARACTERES_MAXIMUM } from "@/lib/depots/bornes-du-depot";
import { deposer } from "@/lib/depots/deposer";
import { redecouper, type ResultatRedecoupage } from "@/lib/depots/redecouper";
import { declencher } from "@/lib/jobs/queue";
import { etatDuDepot, type EtatDepot as EtatDeLaChaine } from "@/lib/domain/etat-depot";

/**
 * Chaque geste vérifie la session puis la propriété : l'identifiant vient de la
 * session, et une ressource d'un autre compte n'est pas trouvée, donc pas touchée.
 */

export type EtatDepot = { erreur?: string; quota?: boolean };

/** Relu à chaque tour par l'écran de détail : deux valeurs, pas une page. */
export type EtatDepotSuivi = { etat: EtatDeLaChaine; concepts: number };

/** Un identifiant refusé vaut une ressource introuvable : le geste ne fait rien. */
const Identifiant = z.string().min(1).max(64);
const TexteDeConcept = z.string().trim().min(20).max(CARACTERES_MAXIMUM);

function lireIdentifiant(valeur: unknown): string | null {
  const lu = Identifiant.safeParse(valeur);

  return lu.success ? lu.data : null;
}

function champIdentifiant(donnees: FormData, nom: string): string | null {
  return lireIdentifiant(donnees.get(nom));
}

function revaliderLeDepot(donnees: FormData): void {
  const inputId = champIdentifiant(donnees, "inputId");

  if (inputId) revalidatePath(`${ROUTES.depots}/${inputId}`);
}

async function utilisateurOuRefus(): Promise<string> {
  const utilisateur = await lireLUtilisateur();

  if (!utilisateur) redirect(ROUTES.connexion);

  return utilisateur.id;
}

export async function deposerAction(_precedent: EtatDepot, donnees: FormData): Promise<EtatDepot> {
  const userId = await utilisateurOuRefus();
  // Les refus s'affichent : dans la langue de la personne.
  const resultat = await deposer(userId, donnees, await getTranslations("depots.refus"));

  if (!resultat.ok) {
    return { erreur: resultat.motif, quota: resultat.quota };
  }

  revalidatePath(ROUTES.depots);

  // Vers le dépôt : seul écran qui se recharge quand le découpage aboutit, la
  // liste resterait figée sur « en cours ».
  redirect(`${ROUTES.depots}/${resultat.inputId}`);
}

/** Après la réponse ; un job qui ne part pas reste en attente et le cron le ramasse. */
function lancer(jobs: string[]): void {
  for (const jobId of jobs) declencher(jobId);
}

export async function modifierConceptAction(donnees: FormData): Promise<void> {
  const userId = await utilisateurOuRefus();
  const atomId = champIdentifiant(donnees, "atomId");
  const texte = TexteDeConcept.safeParse(donnees.get("concept"));

  if (!atomId || !texte.success) return;

  const jobs = await modifierConcept(atomId, userId, texte.data);

  if (jobs) {
    lancer(jobs);
    revaliderLeDepot(donnees);
  }
}

export async function confirmerConceptAction(donnees: FormData): Promise<void> {
  const userId = await utilisateurOuRefus();
  const atomId = champIdentifiant(donnees, "atomId");

  if (!atomId) return;

  const jobs = await confirmerConcept(atomId, userId);

  if (jobs) {
    lancer(jobs);
    revaliderLeDepot(donnees);
  }
}

export async function desarchiverConceptAction(donnees: FormData): Promise<void> {
  const userId = await utilisateurOuRefus();
  const atomId = champIdentifiant(donnees, "atomId");

  if (atomId && (await desarchiverConcept(atomId, userId))) {
    revalidatePath(ROUTES.aujourdhui);
    revaliderLeDepot(donnees);
  }
}

/** Le même geste, depuis la session ; le booléen dit si la bande d'annulation peut partir. */
export async function annulerMaitriseAction(atomId: string): Promise<boolean> {
  const userId = await utilisateurOuRefus();
  const id = lireIdentifiant(atomId);

  if (!id) return false;

  // Pas de revalidation : la session serait recomposée et la question changerait
  // sous les doigts. Le tableau de bord est rendu à la demande.
  return desarchiverConcept(id, userId);
}

export async function supprimerConceptAction(donnees: FormData): Promise<void> {
  const userId = await utilisateurOuRefus();
  const atomId = champIdentifiant(donnees, "atomId");

  if (atomId && (await supprimerConcept(atomId, userId))) revaliderLeDepot(donnees);
}

export async function supprimerDepotAction(donnees: FormData): Promise<void> {
  const userId = await utilisateurOuRefus();
  const inputId = champIdentifiant(donnees, "inputId");

  if (inputId && (await supprimerDepot(inputId, userId))) {
    revalidatePath(ROUTES.depots);
    revalidatePath(ROUTES.aujourdhui);
  }

  redirect(ROUTES.depots);
}

/** Relance une extraction sur le texte d'un dépôt vidé ou en échec. */
export async function redecouperAction(inputId: string): Promise<ResultatRedecoupage> {
  const userId = await utilisateurOuRefus();
  const t = await getTranslations("depots.refus");
  const id = lireIdentifiant(inputId);

  if (!id) return { ok: false, motif: t("introuvable") };

  const resultat = await redecouper(userId, id, t);

  if (resultat.ok) revalidatePath(`${ROUTES.depots}/${id}`);

  return resultat;
}

export async function rejoindreListeDattenteAction(): Promise<void> {
  await inscrireEnListeDattente(await utilisateurOuRefus());
  revalidatePath(`${ROUTES.depots}/nouveau`);
}

/** `null` ne distingue pas un dépôt inexistant d'un dépôt d'un autre compte. */
export async function avancementDuDepotAction(inputId: string): Promise<EtatDepotSuivi | null> {
  const userId = await utilisateurOuRefus();
  const id = lireIdentifiant(inputId);

  if (!id) return null;

  const avancement = await lireAvancementDuDepot(id, userId);

  if (!avancement) return null;

  return { etat: etatDuDepot(avancement), concepts: avancement.concepts };
}
