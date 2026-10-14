import { MODELE_EMBEDDING } from "./espace";
import type { MesuresDuDepot, Paire, Rapproche } from "./signaux";
import { rendreLesDeciles, rendreLeTableau } from "./tableaux-de-calibration";
import { nombre } from "../nombre-en-francais";

/**
 * Le rapport du passage de calibration. Aucun seuil n'y est appliqué : il rend
 * des listes triées pour qu'on voie où la ressemblance s'arrête et qu'on y pose
 * les planchers à la main, plutôt que de les décider avant de les avoir vus.
 *
 * Chaque extrait est borné et porte le compte total : une liste tronquée en
 * silence se lirait « il n'y en avait que dix ».
 */

/** Paires montrées en tête de corpus. */
const PAIRES_MONTREES = 50;

/** Phrases et concepts montrés par dépôt, les moins couverts d'abord. */
const PAR_DEPOT_MONTRES = 10;

const EXTRAIT = 150;

function extrait(texte: string): string {
  const plat = texte.replace(/\s+/g, " ").trim();

  return plat.length > EXTRAIT ? `${plat.slice(0, EXTRAIT)}…` : plat;
}

function proximite(valeur: number): string {
  return valeur.toFixed(3);
}

/** Toutes les paires du corpus, dépôt d'origine attaché, triées ensemble. */
function pairesDuCorpus(
  mesures: MesuresDuDepot[],
  extraire: (mesure: MesuresDuDepot) => Paire[],
): { depot: string; paire: Paire }[] {
  return mesures
    .flatMap((mesure) => extraire(mesure).map((paire) => ({ depot: mesure.nom, paire })))
    .sort((un, deux) => deux.paire.proximite - un.paire.proximite);
}

function rendreLesPaires(
  titre: string,
  entrees: { depot: string; paire: Paire }[],
  absence?: string,
): string[] {
  if (absence !== undefined) return [`## ${titre}`, "", absence, ""];

  if (entrees.length === 0) {
    return [`## ${titre}`, "", "Aucune paire : il faudrait au moins deux éléments.", ""];
  }

  const montrees = entrees.slice(0, PAIRES_MONTREES);
  const lignes = montrees.flatMap(({ depot, paire }, rang) => [
    `${rang + 1}. **${proximite(paire.proximite)}** · \`${depot}\``,
    `   - ${extrait(paire.un)}`,
    `   - ${extrait(paire.deux)}`,
  ]);

  return [
    `## ${titre}`,
    "",
    `${nombre(montrees.length)} montrées sur ${nombre(entrees.length)} paires calculées.`,
    "",
    ...lignes,
    "",
  ];
}

function rendreLaListe(titre: string, entrees: Rapproche[], voisinage: string): string[] {
  if (entrees.length === 0) return [`**${titre}** — rien à mesurer.`, ""];

  const montrees = entrees.slice(0, PAR_DEPOT_MONTRES);

  return [
    `**${titre}** — ${nombre(montrees.length)} sur ${nombre(entrees.length)}, du plus bas au plus haut.`,
    "",
    ...montrees.map(
      (entree) =>
        `- **${proximite(entree.proximite)}** ${extrait(entree.texte)}\n  ↳ ${voisinage} ${extrait(entree.voisin)}`,
    ),
    "",
  ];
}

export type EnTeteDeCalibration = {
  emisA: Date;
  source: string;
  dimension: number;
  calcules: number;
  enCache: number;
  tokens: number;
};

export function rendreLaCalibration(
  mesures: MesuresDuDepot[],
  entete: EnTeteDeCalibration,
): string {
  const segments = mesures.reduce((total, mesure) => total + mesure.segments, 0);
  const concepts = mesures.reduce((total, mesure) => total + mesure.concepts, 0);
  const mesuresAvecQuestions = mesures.filter((mesure) => mesure.radotage !== null);

  const sansQuestions =
    mesuresAvecQuestions.length === 0
      ? "Non mesuré : aucun dépôt figé ne porte encore ses questions. Elles sont gelées à partir du prochain passage de génération, et cette section se remplira toute seule."
      : undefined;

  return [
    `# Mesures du corpus — ${entete.emisA.toISOString().slice(0, 16).replace("T", " ")} UTC`,
    "",
    `\`${MODELE_EMBEDDING}\` · ${entete.dimension} dimensions · ${entete.source}`,
    "",
    [
      `${nombre(mesures.length)} dépôts`,
      `${nombre(segments)} segments`,
      `${nombre(concepts)} concepts`,
      `${nombre(mesuresAvecQuestions.length)} dépôts avec questions`,
    ].join(" · "),
    "",
    `Vecteurs : ${nombre(entete.calcules)} calculés, ${nombre(entete.enCache)} lus au cache · ${nombre(entete.tokens)} tokens facturés`,
    "",
    "**Aucun seuil n'est appliqué.** Ce passage sert à les fixer : les listes sont triées, rien n'est signalé.",
    "",
    ...rendreLesDeciles(mesures),
    ...rendreLeTableau(mesures),
    ...rendreLesPaires(
      "Les paires de concepts les plus proches — tous dépôts",
      pairesDuCorpus(mesures, (mesure) => mesure.doublons),
    ),
    ...rendreLesPaires(
      "Les paires de questions les plus proches — même concept",
      pairesDuCorpus(mesures, (mesure) => mesure.radotage?.intraLot ?? []),
      sansQuestions,
    ),
    ...rendreLesPaires(
      "Les paires de questions les plus proches — concepts différents",
      pairesDuCorpus(mesures, (mesure) => mesure.radotage?.interConcepts ?? []),
      sansQuestions,
    ),
    "## Par dépôt — les moins couverts d'abord",
    "",
    ...mesures.flatMap((mesure) => [
      `### ${mesure.nom}`,
      "",
      ...rendreLaListe(
        "Phrases par couverture croissante",
        mesure.couverture,
        "concept le plus proche :",
      ),
      ...rendreLaListe("Concepts par soutien croissant", mesure.soutien, "phrase la plus proche :"),
    ]),
  ].join("\n");
}
