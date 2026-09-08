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
import { CARACTERES_MAXIMUM, longueurEnClair, motifDeLongueur } from "@/lib/depots/bornes-du-depot";
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
 */
const anonymeSchema = z.object({
  texte: z
    .string()
    .trim()
    .superRefine((texte, controle) => {
      const motif = motifDeLongueur(texte);

      if (motif) controle.addIssue({ code: "custom", message: motif });
    }),
});

export type ResultatDepotAnonyme =
  { ok: true; sessionId: string; inputId: string } | { ok: false; motif: string };

const TROP_DE_DEPOTS =
  "Beaucoup d'essais sont partis d'ici récemment. Crée un compte pour continuer — c'est gratuit.";

/**
 * Les essais du jour sont faits, et ils ont donné quelque chose.
 *
 * « Pour cette visite » a cessé d'être vrai le jour où les essais se sont comptés
 * sur vingt-quatre heures glissantes : la même personne, avec le même cookie,
 * redépose demain. Dire quand la porte se rouvre est la seule chose utile à
 * quelqu'un qu'on refuse, et c'est aussi ce qui l'empêche d'aller chercher un
 * autre navigateur pour la contourner.
 */
const ESSAIS_DU_JOUR_FAITS =
  "Tes essais du jour sont faits. Crée un compte pour garder tes concepts et en déposer d'autres, ou reviens demain.";

/**
 * Le même refus, mais sans concepts derrière.
 *
 * L'essai n'a rien donné, deux fois. Lui parler de « tes concepts » désignerait
 * du vide et ferait passer l'invitation pour un bug ; on dit ce qui s'est passé,
 * et ce qu'un compte change — des dépôts plus longs, et des reprises.
 */
const ESSAIS_EPUISES = `Tes essais du jour sont faits. Un compte lève la limite, accepte ${longueurEnClair(CARACTERES_MAXIMUM)}, et c'est gratuit.`;

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
  if (await essaiAbouti(sessionId)) return ESSAIS_DU_JOUR_FAITS;

  const { pannes } = await compterLesDepots(sessionId);

  return pannes >= PANNES_TOLEREES ? DECOUPAGE_INDISPONIBLE : ESSAIS_EPUISES;
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

  const visite = !sansLimite && sessionExistante ? await etatDeLaVisite(sessionExistante) : "close";

  if (visite === "epuisee" && sessionExistante) {
    return { ok: false, motif: await motifDuRefus(sessionExistante) };
  }

  // « close » ouvre une visite neuve plutôt que de refuser : le cookie désigne
  // alors une visite qui n'existe plus, ou qui appartient déjà à un compte. Il
  // n'y avait rien à compter dessus, et on répondait pourtant « tes essais du
  // jour sont faits » à quelqu'un qui n'avait rien dépensé.
  const session =
    visite === "ouverte" && sessionExistante
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
