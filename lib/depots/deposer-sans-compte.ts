import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { marquerEnCours } from "@/lib/db/ingestion";
import {
  compterLesDepots,
  essaiAbouti,
  ouvrirUneSession,
  PANNES_TOLEREES,
  sessionDisponible,
} from "@/lib/db/session-anonyme";
import {
  CARACTERES_MAXIMUM,
  CARACTERES_MAXIMUM_ANONYME,
  CARACTERES_MINIMUM_ANONYME,
  longueurEnClair,
} from "@/lib/depots/bornes-du-depot";
import { essaiSansLimite, VARIABLE_SANS_LIMITE } from "@/lib/depots/essai-sans-limite";
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

const anonymeSchema = z.object({
  texte: z
    .string()
    .trim()
    .min(CARACTERES_MINIMUM_ANONYME, {
      error: "Colle un peu plus de matière : une phrase ou deux, au minimum.",
    })
    .max(CARACTERES_MAXIMUM_ANONYME, {
      error: `Ce texte dépasse ${longueurEnClair(CARACTERES_MAXIMUM_ANONYME)}. Crée un compte pour aller jusqu'à ${longueurEnClair(CARACTERES_MAXIMUM)}.`,
    }),
});

export type ResultatDepotAnonyme =
  { ok: true; sessionId: string; inputId: string } | { ok: false; motif: string };

const TROP_DE_DEPOTS =
  "Beaucoup d'essais sont partis d'ici récemment. Crée un compte pour continuer — c'est gratuit.";

const DEJA_DEPOSE =
  "Tu as fait ton essai. Crée un compte pour garder tes concepts et en déposer d'autres.";

/**
 * Le même refus, mais sans concepts derrière.
 *
 * L'essai n'a rien donné, deux fois. Lui parler de « tes concepts » désignerait
 * du vide et ferait passer l'invitation pour un bug ; on dit ce qui s'est passé,
 * et ce qu'un compte change — des dépôts plus longs, et des reprises.
 */
const ESSAIS_EPUISES = `Tes essais sont faits pour cette visite. Un compte lève la limite, accepte ${longueurEnClair(CARACTERES_MAXIMUM)}, et c'est gratuit.`;

/**
 * La visite s'est fermée sur nos pannes, pas sur ses essais.
 *
 * Ses essais sont intacts — c'est toute la règle — donc lui dire qu'ils sont
 * faits serait le troisième message faux de ce chemin. On dit ce qui se passe
 * vraiment, et le compte devient la seule suite qu'on ait à offrir.
 */
const DECOUPAGE_INDISPONIBLE =
  "Le découpage ne répond pas en ce moment, et ça ne vient pas de ton texte. Crée un compte : tu pourras reprendre dès que ce sera rétabli.";

/**
 * Pourquoi la visite est fermée. Trois causes, trois phrases.
 *
 * Lu après coup plutôt que deviné : « crée un compte pour garder tes concepts »
 * n'a de sens que s'il y en a, et « tes essais sont faits » que s'ils l'ont été.
 */
async function motifDuRefus(sessionId: string): Promise<string> {
  if (await essaiAbouti(sessionId)) return DEJA_DEPOSE;

  const { pannes } = await compterLesDepots(sessionId);

  return pannes >= PANNES_TOLEREES ? DECOUPAGE_INDISPONIBLE : ESSAIS_EPUISES;
}

/**
 * Dépose sans compte, ou dit pourquoi c'est refusé.
 *
 * `sessionExistante` vient du cookie. Une session qui a déjà déposé est refusée
 * plutôt que réutilisée : c'est le verrou principal, et le rendre glissant en
 * ferait un compte gratuit déguisé.
 *
 * `ESSAI_ANONYME_SANS_LIMITE` lève les deux verrous d'un coup — voir
 * `essai-sans-limite.ts` pour ce que ça ouvre et ce que ça n'ouvre pas. Le
 * cookie est alors ignoré plutôt que réutilisé : une visite rouverte
 * accumulerait ses dépôts, et l'écran n'en montre qu'un.
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

  const sansLimite = essaiSansLimite();

  if (sansLimite) {
    console.warn(
      `[essai] ${VARIABLE_SANS_LIMITE}=true : dépôt anonyme accepté sans vérifier les verrous`,
    );
  }

  if (!sansLimite && sessionExistante && !(await sessionDisponible(sessionExistante))) {
    return { ok: false, motif: await motifDuRefus(sessionExistante) };
  }

  const session =
    sessionExistante && !sansLimite
      ? { ouverte: true as const, sessionId: sessionExistante }
      : await ouvrirUneSession(adresse, sansLimite);

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
