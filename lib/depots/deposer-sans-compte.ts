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
import { enqueueJob } from "@/lib/jobs/queue";

/**
 * Le dépôt d'un visiteur, avant tout compte : la landing montre un vrai
 * découpage, parce que c'est ce qui convertit.
 *
 * Pour rester finançable, la chaîne s'arrête à un seul concept questionné
 * (l'échantillon affiché) ; les autres questions s'écrivent à la création du
 * compte. Pas d'image : la lecture d'une capture doublerait le coût d'un
 * visiteur.
 */

/**
 * La longueur se juge par `defautDeLongueur`, la même fonction que l'écran.
 * Construit à l'appel, parce que les messages dépendent de la langue de `t`.
 */
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

/**
 * Pourquoi la visite est fermée, lu en base plutôt que deviné : chaque refus
 * (`depots.refus.essai.*`) ne vaut que si sa cause est réelle.
 */
async function motifDuRefus(sessionId: string, t: TraduireLesRefus): Promise<string> {
  if (await essaiAbouti(sessionId)) return t("essai.duJourFaits");

  const { pannes } = await compterLesDepots(sessionId);

  if (pannes >= PANNES_TOLEREES) return t("essai.decoupageIndisponible");

  return t("essai.epuises", { limiteCompte: longueurEnClairAvec(t, CARACTERES_MAXIMUM) });
}

/**
 * Dépose sans compte, ou dit pourquoi c'est refusé.
 *
 * La visite du cookie est réutilisée tant qu'il lui reste des essais (deux par
 * 24 h, voir `sessionDisponible`) : tout ce qui a été déposé part ainsi au compte
 * le jour où il est créé.
 *
 * Avec `ESSAI_ANONYME_SANS_LIMITE` (voir `essai-sans-limite.ts`), le cookie est
 * ignoré : une visite rouverte accumulerait des dépôts que l'écran ne montre pas.
 *
 * Sans traducteur, les refus sont en français : la landing anglaise passe
 * `getTranslations("depots.refus")`.
 */
export async function deposerSansCompte(
  texte: string,
  adresse: string,
  sessionExistante: string | null,
  t: TraduireLesRefus = textesDesRefus(),
  /** La langue de la page, figée sur le dépôt. Le défaut sert aux scripts. */
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

  // « close » ouvre une visite neuve : le cookie désigne une visite disparue ou
  // déjà rattachée à un compte, sur laquelle ce visiteur n'a rien dépensé.
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
      // Pas de clé d'envoi : son unicité porte sur `(userId, clé)`. Ce sont les
      // essais comptés sur la visite qui empêchent le double dépôt.
      submissionKey: null,
    },
    select: { id: true },
  });

  await marquerEnCours(depot.id);
  await enqueueJob(depot.id, "ATOMS");

  return { ok: true, sessionId: session.sessionId, inputId: depot.id };
}
