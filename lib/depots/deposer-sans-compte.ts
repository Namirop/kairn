import type { Langue } from "@/lib/db/types";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { marquerEnCours } from "@/lib/db/ingestion";
import {
  compterLesDepots,
  essaiAbouti,
  etatDeLaVisite,
  PANNES_TOLEREES,
} from "@/lib/db/essais-de-la-visite";
import { ouvrirUneSession } from "@/lib/db/session-anonyme";
import {
  CARACTERES_MAXIMUM,
  defautDeLongueur,
  longueurEnClairAvec,
  motifDeDefaut,
  type TraduireLesRefus,
} from "@/lib/depots/bornes-du-depot";
import { essaiSansLimite, VARIABLE_SANS_LIMITE } from "@/lib/depots/essai-sans-limite";
import { textesDesRefus } from "@/lib/depots/textes-des-refus";
import { mettreEnFile } from "@/lib/jobs/queue";

/**
 * Le dépôt d'un visiteur : un vrai découpage, parce que c'est ce qui convertit.
 * Pour rester finançable, un seul concept est questionné, le reste à la
 * création du compte. Pas d'image : la lecture doublerait le coût.
 */

/** Construit à l'appel : les messages dépendent de la langue de `t`. */
function schemaAnonyme(t: TraduireLesRefus) {
  return z.object({
    texte: z
      .string()
      .trim()
      .superRefine((texte, controle) => {
        const defaut = defautDeLongueur(texte);

        if (defaut) controle.addIssue({ code: "custom", message: motifDeDefaut(defaut, t) });
      }),
  });
}

export type ResultatDepotAnonyme =
  { ok: true; sessionId: string; inputId: string } | { ok: false; motif: string };

/** Lu en base, pas deviné : chaque refus ne vaut que si sa cause est réelle. */
async function motifDuRefus(sessionId: string, t: TraduireLesRefus): Promise<string> {
  if (await essaiAbouti(sessionId)) return t("essai.duJourFaits");

  const { pannes } = await compterLesDepots(sessionId);

  if (pannes >= PANNES_TOLEREES) return t("essai.decoupageIndisponible");

  return t("essai.epuises", { limiteCompte: longueurEnClairAvec(t, CARACTERES_MAXIMUM) });
}

/**
 * La visite du cookie est réutilisée tant qu'il lui reste des essais (deux par
 * 24 h) : tout ce qu'elle a déposé part au compte à sa création. Sans limite,
 * le cookie est ignoré : la visite accumulerait des dépôts que l'écran ne
 * montre pas. Le traducteur par défaut est français ; la landing anglaise
 * passe le sien.
 */
export async function deposerSansCompte(
  texte: string,
  adresse: string,
  sessionExistante: string | null,
  t: TraduireLesRefus = textesDesRefus(),
  /** Figée sur le dépôt. Le défaut sert aux scripts. */
  langue: Langue = "FR",
): Promise<ResultatDepotAnonyme> {
  const valide = schemaAnonyme(t).safeParse({ texte });

  if (!valide.success) {
    return { ok: false, motif: valide.error.issues[0]?.message ?? t("nonRecevable") };
  }

  const sansLimite = essaiSansLimite();

  if (sansLimite) {
    console.warn(
      `[essai] ${VARIABLE_SANS_LIMITE}=true : dépôt anonyme accepté sans vérifier les verrous`,
    );
  }

  const visite = !sansLimite && sessionExistante ? await etatDeLaVisite(sessionExistante) : "close";

  if (visite === "epuisee" && sessionExistante) {
    return { ok: false, motif: await motifDuRefus(sessionExistante, t) };
  }

  // « close » : visite disparue ou rattachée à un compte, rien n'y a été dépensé.
  const session =
    visite === "ouverte" && sessionExistante
      ? { ouverte: true as const, sessionId: sessionExistante }
      : await ouvrirUneSession(adresse, sansLimite);

  if (!session.ouverte) return { ok: false, motif: t("essai.tropDeDepots") };

  const depot = await prisma.input.create({
    data: {
      anonymousSessionId: session.sessionId,
      langue,
      rawContent: valide.data.texte,
      sourceType: "TEXT",
      status: "PENDING",
      // Unicité sur `(userId, clé)` : ici, les essais comptés empêchent le doublon.
      submissionKey: null,
    },
    select: { id: true },
  });

  await marquerEnCours(depot.id);
  await mettreEnFile(depot.id, "ATOMS");

  return { ok: true, sessionId: session.sessionId, inputId: depot.id };
}
