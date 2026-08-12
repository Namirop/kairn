import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { marquerEnCours } from "@/lib/db/ingestion";
import { ouvrirUneSession, sessionDisponible } from "@/lib/db/session-anonyme";
import { enqueueJob } from "@/lib/jobs/queue";

/**
 * Le dépôt d'un visiteur, avant tout compte.
 *
 * On dépose, l'extraction tourne, les concepts s'affichent vraiment. C'est ce
 * qui convertit : montrer le découpage. Le faire miroiter derrière une
 * inscription fait fermer l'onglet, et demander un compte avant d'avoir rien
 * montré était la friction la plus coûteuse du produit.
 *
 * **La chaîne s'arrête à l'extraction.** Les questions, qui coûtent l'essentiel,
 * ne sont écrites qu'une fois le compte créé — c'est ce qui rend l'ouverture
 * finançable : un visiteur qui repart coûte le prix d'une extraction.
 *
 * Pas d'image ici, volontairement : une capture ajoute un appel de lecture avant
 * même l'extraction, et double la dépense d'un visiteur qui n'a rien demandé.
 * Le texte suffit à montrer ce que fait le produit.
 */

export const SIGNES_MAXIMUM_ANONYME = 4000;
/** En dessous, il n'y a rien à découper, et la démonstration tombe à plat. */
export const SIGNES_MINIMUM_ANONYME = 40;

const anonymeSchema = z.object({
  texte: z
    .string()
    .trim()
    .min(SIGNES_MINIMUM_ANONYME, {
      error: "Colle un peu plus de matière : une phrase ou deux, au minimum.",
    })
    .max(SIGNES_MAXIMUM_ANONYME, {
      error: `Ce texte dépasse ${SIGNES_MAXIMUM_ANONYME} signes. Crée un compte pour déposer plus long.`,
    }),
});

export type ResultatDepotAnonyme =
  { ok: true; sessionId: string; inputId: string } | { ok: false; motif: string };

const TROP_DE_DEPOTS =
  "Beaucoup d'essais sont partis d'ici récemment. Crée un compte pour continuer — c'est gratuit.";

const DEJA_DEPOSE =
  "Tu as fait ton essai. Crée un compte pour garder tes concepts et en déposer d'autres.";

/**
 * Dépose sans compte, ou dit pourquoi c'est refusé.
 *
 * `sessionExistante` vient du cookie. Une session qui a déjà déposé est refusée
 * plutôt que réutilisée : c'est le verrou principal, et le rendre glissant en
 * ferait un compte gratuit déguisé.
 */
export async function deposerSansCompte(
  texte: string,
  adresse: string,
  sessionExistante: string | null,
): Promise<ResultatDepotAnonyme> {
  const valide = anonymeSchema.safeParse({ texte });

  if (!valide.success) {
    return { ok: false, motif: valide.error.issues[0]?.message ?? "Ce dépôt n'est pas recevable." };
  }

  if (sessionExistante && !(await sessionDisponible(sessionExistante))) {
    return { ok: false, motif: DEJA_DEPOSE };
  }

  const session = sessionExistante
    ? { ouverte: true as const, sessionId: sessionExistante }
    : await ouvrirUneSession(adresse);

  if (!session.ouverte) return { ok: false, motif: TROP_DE_DEPOTS };

  const depot = await prisma.input.create({
    data: {
      anonymousSessionId: session.sessionId,
      rawContent: valide.data.texte,
      sourceType: "TEXT",
      status: "PENDING",
      // Pas de clé d'envoi : la contrainte d'unicité porte sur `(userId, clé)`,
      // et un dépôt anonyme n'a pas de compte. C'est la session à un seul dépôt
      // qui joue ce rôle-là, et elle le joue mieux.
      submissionKey: null,
    },
    select: { id: true },
  });

  await marquerEnCours(depot.id);
  await enqueueJob(depot.id, "ATOMS");

  return { ok: true, sessionId: session.sessionId, inputId: depot.id };
}
