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
 * Le dépôt d'un visiteur, avant tout compte.
 *
 * On dépose, l'extraction tourne, les concepts s'affichent vraiment. C'est ce
 * qui convertit : montrer le découpage. Le faire miroiter derrière une
 * inscription fait fermer l'onglet, et demander un compte avant d'avoir rien
 * montré était la friction la plus coûteuse du produit.
 *
 * **La chaîne s'arrête à un seul concept questionné.** L'extraction rend tous
 * les concepts, et un seul d'entre eux reçoit ses quatre questions : c'est
 * l'échantillon que la landing montre. Le reste des questions n'est écrit
 * qu'une fois le compte créé — c'est ce qui rend l'ouverture finançable.
 *
 * Pas d'image ici, volontairement : une capture ajoute un appel de lecture avant
 * même l'extraction, et double la dépense d'un visiteur qui n'a rien demandé.
 * Le texte suffit à montrer ce que fait le produit.
 */

/**
 * La longueur se juge par la fonction que l'écran appelle déjà, pas par deux
 * bornes Zod qui recopieraient ses messages. Le schéma garde ce qu'il sait faire
 * de mieux ici : refuser ce qui n'est pas une chaîne, et couper les blancs.
 *
 * Construit à l'appel, parce que le message dépend de la langue de `t`.
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

/*
  Les trois refus d'une visite fermée — essais faits, essais épuisés sans
  concept, découpage en panne — sont `depots.refus.essai.duJourFaits`,
  `epuises` et `decoupageIndisponible`. Le pourquoi de chaque tournure est
  écrit au-dessus de sa phrase, dans les messages.
*/

/**
 * Pourquoi la visite est fermée. Trois causes, trois phrases.
 *
 * Lu après coup plutôt que deviné : « crée un compte pour garder tes concepts »
 * n'a de sens que s'il y en a, et « tes essais sont faits » que s'ils l'ont été.
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
 * `sessionExistante` vient du cookie, et elle est **réutilisée** tant qu'il lui
 * reste des essais. C'est ce qui permet de redéposer sans compte, et c'est aussi
 * ce qui garantit que tout ce qu'on a déposé part au compte le jour où on le
 * crée : le cookie ne bouge jamais, donc rien ne reste derrière.
 *
 * Ce qui borne le geste n'est donc plus « un dépôt par cookie » mais deux
 * essais par tranche de vingt-quatre heures — voir `sessionDisponible`.
 *
 * `ESSAI_ANONYME_SANS_LIMITE` lève les deux verrous d'un coup — voir
 * `essai-sans-limite.ts` pour ce que ça ouvre et ce que ça n'ouvre pas. Le
 * cookie est alors ignoré plutôt que réutilisé : une visite rouverte
 * accumulerait ses dépôts, et l'écran n'en montre qu'un.
 *
 * Les refus se disent dans la langue de `t`. Sans traducteur, c'est le
 * français : la landing anglaise doit passer `getTranslations("depots.refus")`.
 */
export async function deposerSansCompte(
  texte: string,
  adresse: string,
  sessionExistante: string | null,
  t: TraduireLesRefus = textesDesRefus(),
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

  // « close » ouvre une visite neuve plutôt que de refuser : le cookie désigne
  // alors une visite qui n'existe plus, ou qui appartient déjà à un compte. Il
  // n'y avait rien à compter dessus, et on répondait pourtant « tes essais du
  // jour sont faits » à quelqu'un qui n'avait rien dépensé.
  const session =
    visite === "ouverte" && sessionExistante
      ? { ouverte: true as const, sessionId: sessionExistante }
      : await ouvrirUneSession(adresse, sansLimite);

  if (!session.ouverte) return { ok: false, motif: t("essai.tropDeDepots") };

  const depot = await prisma.input.create({
    data: {
      anonymousSessionId: session.sessionId,
      rawContent: valide.data.texte,
      sourceType: "TEXT",
      status: "PENDING",
      // Pas de clé d'envoi : la contrainte d'unicité porte sur `(userId, clé)`,
      // et un dépôt anonyme n'a pas de compte. Ce sont les essais comptés sur la
      // visite qui jouent ce rôle-là, et ils le jouent mieux.
      submissionKey: null,
    },
    select: { id: true },
  });

  await marquerEnCours(depot.id);
  await enqueueJob(depot.id, "ATOMS");

  return { ok: true, sessionId: session.sessionId, inputId: depot.id };
}
