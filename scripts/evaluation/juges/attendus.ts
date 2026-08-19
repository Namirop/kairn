import { z } from "zod";
import { callAI } from "@/lib/ai/client";
import type { AiContract } from "@/lib/ai/schemas";
import { MODELE_DES_JUGES, MOTIF_MAXIMUM, TOKENS_DES_JUGES } from "./modele";

/**
 * Le juge d'attendus — la géométrie sélectionne, le juge tranche.
 *
 * Le premier essai avait fait de la proximité un verdict : au-dessus du
 * plancher, l'attendu passait couvert sans autre lecture. Le passage 23h09 a
 * montré le trou — `22` sortait 6/6 couverts par proximité alors que le juge
 * de résidu confirmait 4 manques de phrases au même moment sur les mêmes
 * sujets. C'est la troisième occurrence de la même leçon : **le cosinus mesure
 * le même sujet, pas la même affirmation.**
 *
 * Ici, la proximité ne sert qu'à désigner une ou deux concepts candidats pour
 * chaque attendu. Le juge répond à une question locale et binaire : ce concept
 * couvre-t-il cette idée, y compris ses chiffres, ses seuils et ses conditions ?
 * Un concept qui parle du bon sujet sans porter le facteur ou la condition de
 * l'attendu ne le couvre pas.
 *
 * Un appel par dépôt, tous ses attendus groupés — deux appels par passage sur
 * le corpus actuel (22 et 27), quelques centimes.
 */

const verdictAttendu = z.object({
  numero: z
    .number()
    .int()
    .describe("Le numéro de l'attendu jugé, tel que présenté (### Attendu #N)."),
  couvert: z
    .boolean()
    .describe(
      "true si au moins un des concepts candidats couvre l'attendu — chiffres, seuils, mécanismes et conditions inclus. false dès qu'un élément clé manque à tous les concepts candidats.",
    ),
  motif: z
    .string()
    .describe(
      "Une phrase courte : le chiffre, le seuil, le mécanisme ou la condition manquant, ou la confirmation que la couverture est complète.",
    ),
});

const sortieLue = z.object({
  attendus: z
    .array(verdictAttendu)
    .describe("Un verdict par attendu soumis, dans l'ordre reçu."),
});

const attendusForme = sortieLue.extend({
  attendus: z.array(
    verdictAttendu.extend({ motif: verdictAttendu.shape.motif.min(1).max(MOTIF_MAXIMUM) }),
  ),
});

const attendusValidation = sortieLue;

/** `couvert: null` = abstention (item non rendu par le juge). Voir `residu.ts`. */
export type VerdictAttendu = { couvert: boolean | null; motif: string };

const CONTRAT: AiContract<z.infer<typeof attendusValidation>> = {
  purpose: "juge_attendus",
  forme: attendusForme,
  validation: attendusValidation,
};

const SYSTEM = `Tu vérifies qu'une idée attendue est vraiment couverte par les concepts d'un dépôt.

Pour chaque attendu, on te présente une ou deux concepts candidats — ceux que
la géométrie a désignés comme les plus proches. Ton verdict est binaire :
au moins un de ces concepts couvre-t-il l'attendu, chiffres, seuils, mécanismes
et conditions inclus ?

Un concept **couvre** un attendu quand une personne qui lit ce concept peut
répondre juste à toute question que l'attendu implique. Reformulation,
synonymes et inversion logique sont admis tant que les éléments clés sont
présents.

Un concept **ne couvre pas** un attendu dès qu'un élément clé manque :
- un chiffre ou un seuil (« sous 10 % », « quatre courbes ») que le concept
  ne porte pas
- un facteur ou un rapport (« un doublement de pente quadruple la vitesse »)
  qui ne s'y déduit pas
- un mécanisme précis (« un pyrocumulonimbus produit des éclairs ») que le
  concept ne nomme pas
- une condition (« au contact d'une étincelle », « sans retour ») absente

Parler du même sujet ne suffit pas. Un concept qui dit « l'humidité est le
paramètre principal » ne couvre pas un attendu qui dit « sous 10 % d'humidité,
une brindille s'enflamme au contact d'une étincelle » : le seuil et la
condition n'y sont pas.

Chaque attendu porte un numéro (### Attendu #N). **Reporte ce numéro dans le
verdict.** Un verdict par attendu, jamais deux, jamais zéro.

Le motif est court : nomme le chiffre, la condition ou le mécanisme manquant,
ou confirme que la couverture est complète. Pas d'introduction, pas de
conclusion.`;

/** Ce qu'on présente au juge pour un attendu : son texte et ses candidats. */
export type AttenduSoumis = {
  attendu: string;
  candidats: string[];
};

function decrireAttendu(soumis: AttenduSoumis, rang: number): string {
  const lignes = [`### Attendu #${rang + 1}`, soumis.attendu, "", "Concepts candidats :"];
  soumis.candidats.forEach((concept, i) => {
    lignes.push(`${i + 1}. ${concept}`);
  });

  return lignes.join("\n");
}

/**
 * Rend un verdict par attendu soumis, dans l'ordre.
 *
 * L'appariement se fait par `numero` pour survivre à un modèle qui reformule
 * ou décale — même robustesse que le juge de résidu.
 */
export async function jugerLesAttendus(
  nom: string,
  soumis: AttenduSoumis[],
): Promise<VerdictAttendu[]> {
  if (soumis.length === 0) return [];

  const contenu = [
    `Dépôt : ${nom}`,
    "",
    `${soumis.length} attendu(s) à juger — verdicts #1 à #${soumis.length}.`,
    "",
    soumis.map(decrireAttendu).join("\n\n"),
  ].join("\n");

  const sortie = await callAI({
    contract: CONTRAT,
    system: SYSTEM,
    messages: [{ role: "user", content: [{ type: "text", text: contenu }] }],
    model: MODELE_DES_JUGES,
    maxTokens: TOKENS_DES_JUGES,
  });

  const parNumero = new Map(sortie.attendus.map((v) => [v.numero, v]));

  return soumis.map((_, rang) => {
    const verdict = parNumero.get(rang + 1);
    return verdict
      ? { couvert: verdict.couvert, motif: verdict.motif.trim() }
      : { couvert: null, motif: "non rendu par le juge" };
  });
}
