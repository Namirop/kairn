import { MOTS_MAX_DU_TROU } from "@/lib/domain/controle-question";
import type { Passage } from "./rapport-chiffres";

/**
 * Les mesures sur l'ensemble des questions d'un passage : un défaut de
 * distribution est invisible question par question. Une bonne réponse en
 * première position n'a rien d'anormal — sauf quand c'est neuf fois sur dix.
 *
 * Un écart est signalé au-delà de trois écarts-types binomiaux : le seuil suit
 * la taille du passage, là où un pourcentage fixe crierait au loup sur vingt
 * questions et ne verrait rien sur trois cents.
 */

const RANGS = [0, 1, 2, 3];

/** En dessous, aucune répartition ne veut rien dire. */
const ECHANTILLON_MINIMUM = 8;

/** Trois écarts-types d'une binomiale : ~0,3 % de fausse alerte par rang. */
function tolerance(total: number, part: number): number {
  return 3 * Math.sqrt(total * part * (1 - part));
}

function decimale(valeur: number): string {
  return valeur.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function comptesParRang(rangs: number[]): number[] {
  return RANGS.map((rang) => rangs.filter((observe) => observe === rang).length);
}

function ligneDuTableau(intitule: string, comptes: number[]): string {
  return `| ${intitule} | ${comptes.join(" | ")} |`;
}

/** Les QCM du passage, avec la position servie et celle rendue par le modèle. */
function positions(passages: Passage[]) {
  const qcm = passages
    .flatMap((passage) => passage.evaluation.concepts)
    .flatMap((concept) => concept.variants)
    .filter((variant) => variant.format === "MCQ" && variant.correctIndex !== null);

  return {
    servies: qcm.map((variant) => variant.correctIndex ?? 0),
    brutes: qcm.flatMap((variant) => (variant.rangBrut === null ? [] : [variant.rangBrut])),
  };
}

function rendrePositions(passages: Passage[]): string[] {
  const { servies, brutes } = positions(passages);
  const total = servies.length;

  if (total < ECHANTILLON_MINIMUM) {
    return [
      "### Position de la bonne réponse",
      "",
      `Trop peu de QCM sur ce passage (${total}) pour lire une répartition.`,
      "",
    ];
  }

  const comptes = comptesParRang(servies);
  const attendu = total / 4;
  const marge = tolerance(total, 0.25);
  const fautifs = RANGS.filter((rang) => Math.abs((comptes[rang] ?? 0) - attendu) > marge);

  const lignes = [
    "### Position de la bonne réponse",
    "",
    `Sur ${total} QCM. Un tirage uniforme en met ${decimale(attendu)} par rang ; au-delà de` +
      ` ${decimale(marge)} d'écart, ce n'est plus du hasard.`,
    "",
    "| Répartition | rang 1 | rang 2 | rang 3 | rang 4 |",
    "| --- | --- | --- | --- | --- |",
    ligneDuTableau("Servie", comptes),
    ligneDuTableau("Rendue par le modèle", comptesParRang(brutes)),
    "",
  ];

  if (fautifs.length === 0) return lignes;

  return [
    ...lignes,
    ...fautifs.map(
      (rang) =>
        `> **Manquement — position** : le rang ${rang + 1} porte ${comptes[rang]} des ${total}` +
        ` bonnes réponses servies, contre ${decimale(attendu)} attendues.`,
    ),
    "",
  ];
}

/** Le premier mot d'une réponse, sans accent ni casse. */
function premierMot(reponse: string): string {
  return (
    reponse
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .match(/[a-z]+/)?.[0] ?? ""
  );
}

/** Les vrai ou faux du passage, avec ce qui leur était demandé. */
function affirmations(passages: Passage[]) {
  return passages
    .flatMap((passage) => passage.evaluation.concepts)
    .flatMap((concept) => concept.variants)
    .filter((variant) => variant.format === "TRUE_FALSE");
}

/**
 * La part des vrai ou faux dont l'affirmation est fausse, et l'obéissance à la
 * cible que le serveur tire avant l'appel (`lib/domain/vrai-ou-faux.ts`) — un
 * prompt qui demande « à peu près la moitié » n'est pas tenu.
 *
 * La répartition servie est ce que rencontre la personne ; l'obéissance dit
 * d'où vient un écart : un modèle qui suit ses cibles et une répartition qui
 * dérive quand même accusent le tirage, pas le prompt.
 *
 * `estVraie` est la source ; le premier mot d'`answerKey` sert de recoupement :
 * une affirmation qui se déclare vraie et se répond « Faux » est inexploitable.
 */
function rendreVraiOuFaux(passages: Passage[]): string[] {
  const posees = affirmations(passages);
  const declarees = posees.filter((variant) => (variant.estVraie ?? null) !== null);
  const fausses = declarees.filter((variant) => variant.estVraie === false).length;
  const lues = declarees.length;
  const muettes = posees.length - lues;
  const reste = muettes > 0 ? ` ${muettes} ne déclarent pas leur valeur.` : "";

  if (lues < ECHANTILLON_MINIMUM) {
    return [
      "### Vrai ou faux",
      "",
      `Trop peu d'affirmations déclarées (${lues}) pour lire une répartition.${reste}`,
      "",
    ];
  }

  const avecCible = declarees.filter((variant) => (variant.cible ?? null) !== null);
  const desobeissent = avecCible.filter((variant) => variant.estVraie !== variant.cible).length;
  const incoherentes = declarees.filter((variant) => {
    const mot = premierMot(variant.answerKey);

    if (mot !== "vrai" && mot !== "faux" && mot !== "true" && mot !== "false") return false;

    return (mot === "vrai" || mot === "true") !== variant.estVraie;
  }).length;

  const part = fausses / lues;
  const lignes = [
    "### Vrai ou faux",
    "",
    `${fausses} des ${lues} affirmations sont fausses (${Math.round(part * 100)} %).` +
      ` La cible tirée par le serveur en vise la moitié.${reste}`,
    "",
    avecCible.length === 0
      ? "Aucune cible n'accompagnait ce passage : rien à contrôler côté obéissance."
      : `${desobeissent} des ${avecCible.length} affirmations ne suivent pas la cible qui leur` +
        ` était fixée, ${incoherentes} se répondent à l'envers de ce qu'elles déclarent.`,
    "",
  ];

  if (Math.abs(fausses - lues / 2) <= tolerance(lues, 0.5)) return lignes;

  return [
    ...lignes,
    `> **Manquement — vrai ou faux** : ${Math.round(part * 100)} % d'affirmations fausses,` +
      " loin de la moitié servie attendue.",
    "",
  ];
}

/**
 * Ce que masquent les textes à trou, résumé en tête du rapport : le manquement
 * par question se perd dans le détail. Seul format où l'on produit la réponse,
 * un trou qui avale une proposition entière fait échouer la comparaison sur des
 * réponses justes.
 */
function rendreTrous(passages: Passage[]): string[] {
  const trous = passages
    .flatMap((passage) => passage.evaluation.concepts)
    .flatMap((concept) => concept.variants)
    .flatMap((variant) => {
      const terme = variant.format === "CLOZE" ? (variant.cloze?.accepted[0]?.trim() ?? "") : null;

      return terme === null ? [] : [{ terme, mots: terme.split(/\s+/).filter(Boolean).length }];
    });

  if (trous.length === 0) return ["### Texte à trou", "", "Aucun texte à trou.", ""];

  const trop = trous.filter((trou) => trou.mots > MOTS_MAX_DU_TROU);
  const vides = trous.filter((trou) => trou.mots === 0).length;
  const plusLong = trous.reduce((pire, trou) => (trou.mots > pire.mots ? trou : pire));
  const part = Math.round((trop.length / trous.length) * 100);

  return [
    "### Texte à trou",
    "",
    `${trous.length} textes à trou. ${trop.length} masquent plus de ${MOTS_MAX_DU_TROU} mots` +
      ` (${part} %)${vides > 0 ? `, ${vides} ne masquent rien` : ""}.`,
    "",
    `Le plus long fait ${plusLong.mots} mots : « ${plusLong.terme} ».`,
    "",
  ];
}

export function rendreDistributions(passages: Passage[]): string[] {
  return [
    "## Distributions",
    "",
    ...rendrePositions(passages),
    ...rendreVraiOuFaux(passages),
    ...rendreTrous(passages),
  ];
}
