import { MODELE_EMBEDDING } from "./espace";
import { PLANCHER_COUVERTURE, PLANCHER_DOUBLON, PLANCHER_SOUTIEN } from "./seuils";
import type { MesuresDuDepot, Paire, Rapproche } from "./signaux";
import { signaler, totaliser, type SignalementsDuDepot } from "./signalements";
import { rendreLesDeciles } from "./tableaux-de-calibration";

/**
 * La section « Mesures » du rapport, planchers appliqués.
 *
 * Elle est faite pour être lue **sans ouvrir un autre fichier** : chaque
 * signalement porte ses deux textes en entier, pas une référence à une ligne.
 * C'est la contrainte qui gouverne la mise en forme — un rapport qui oblige à
 * retrouver la phrase ailleurs ne se lit pas, il se survole.
 *
 * Les déciles restent en tête alors que les planchers sont posés, et c'est
 * volontaire : ce sont eux qui diront, d'un passage au suivant, si la
 * distribution a bougé sous les seuils. Un signalement qui double sans que la
 * distribution change dit autre chose qu'un signalement qui double parce que
 * tout le corpus a glissé.
 */

const EXTRAIT = 300;

function extrait(texte: string): string {
  const plat = texte.replace(/\s+/g, " ").trim();

  return plat.length > EXTRAIT ? `${plat.slice(0, EXTRAIT)}…` : plat;
}

function proximite(valeur: number): string {
  return valeur.toFixed(3);
}

function nombre(valeur: number): string {
  return valeur.toLocaleString("fr-FR");
}

function rendreLeTableau(signalements: SignalementsDuDepot[]): string[] {
  const lignes = signalements.map((s) => {
    const radotage = s.radotage === null ? "—" : nombre(s.radotage.interConcepts.length);

    return `| \`${s.nom}\` | ${nombre(s.manques.length)} / ${nombre(s.segments)} | ${nombre(s.inventions.length)} / ${nombre(s.concepts)} | ${nombre(s.doublons.length)} | ${radotage} |`;
  });

  return [
    "## Signalements par dépôt",
    "",
    "C'est ce tableau qui dira, d'un passage à l'autre, si une modification de prompt améliore ou dégrade. Un tiret n'est pas un zéro : c'est « non mesuré ».",
    "",
    "| Dépôt | Manques / phrases | Inventions / concepts | Doublons | Radotage |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...lignes,
    "",
  ];
}

function rendreLesRapproches(entrees: Rapproche[], voisinage: string): string[] {
  return entrees.flatMap((entree) => [
    `- **${proximite(entree.proximite)}** ${extrait(entree.texte)}`,
    `  ↳ ${voisinage} ${extrait(entree.voisin)}`,
    "",
  ]);
}

function rendreLesPaires(paires: Paire[]): string[] {
  return paires.flatMap((paire) => [
    `- **${proximite(paire.proximite)}**`,
    `  - ${extrait(paire.un)}`,
    `  - ${extrait(paire.deux)}`,
    "",
  ]);
}

function rendreLeDepot(signalement: SignalementsDuDepot): string[] {
  const total =
    signalement.manques.length + signalement.inventions.length + signalement.doublons.length;

  if (total === 0) return [];

  const lignes = [`### ${signalement.nom}`, ""];

  if (signalement.manques.length > 0) {
    lignes.push(
      `**Manque — ${signalement.manques.length} phrase(s) qu'aucun concept ne couvre au-dessus de ${PLANCHER_COUVERTURE}.**`,
      "",
      ...rendreLesRapproches(signalement.manques, "concept le plus proche :"),
    );
  }

  if (signalement.inventions.length > 0) {
    lignes.push(
      `**Invention — ${signalement.inventions.length} concept(s) qu'aucune phrase ne soutient au-dessus de ${PLANCHER_SOUTIEN}.**`,
      "",
      ...rendreLesRapproches(signalement.inventions, "phrase la plus proche :"),
    );
  }

  if (signalement.doublons.length > 0) {
    lignes.push(
      `**Doublon — ${signalement.doublons.length} paire(s) au-dessus de ${PLANCHER_DOUBLON}.**`,
      "",
      ...rendreLesPaires(signalement.doublons),
    );
  }

  return lignes;
}

export type EnTeteDeMesures = {
  emisA: Date;
  source: string;
  dimension: number;
  calcules: number;
  enCache: number;
  tokens: number;
};

export function rendreLesMesures(mesures: MesuresDuDepot[], entete: EnTeteDeMesures): string {
  const signalements = mesures.map(signaler);
  const total = totaliser(signalements);
  const segments = mesures.reduce((cumul, mesure) => cumul + mesure.segments, 0);
  const concepts = mesures.reduce((cumul, mesure) => cumul + mesure.concepts, 0);
  const avecQuestions = mesures.filter((mesure) => mesure.radotage !== null).length;

  return [
    `# Mesures du corpus — ${entete.emisA.toISOString().slice(0, 16).replace("T", " ")} UTC`,
    "",
    `\`${MODELE_EMBEDDING}\` · ${entete.dimension} dimensions · ${entete.source}`,
    "",
    [
      `${nombre(mesures.length)} dépôts`,
      `${nombre(segments)} segments`,
      `${nombre(concepts)} concepts`,
      `${nombre(avecQuestions)} dépôts avec questions`,
    ].join(" · "),
    "",
    `Planchers : couverture ${PLANCHER_COUVERTURE} · soutien ${PLANCHER_SOUTIEN} · doublon ${PLANCHER_DOUBLON} · radotage non calibré`,
    "",
    [
      `**${nombre(total.manques)} manques**`,
      `**${nombre(total.inventions)} inventions**`,
      `**${nombre(total.doublons)} doublons**`,
      `sur ${nombre(total.depotsTouches)} dépôts`,
    ].join(" · "),
    "",
    `Vecteurs : ${nombre(entete.calcules)} calculés, ${nombre(entete.enCache)} lus au cache · ${nombre(entete.tokens)} tokens facturés`,
    "",
    "Chaque signalement est un **candidat**, pas un verdict : les juges tranchent, et rien n'est écarté d'ici.",
    "",
    ...rendreLesDeciles(mesures),
    ...rendreLeTableau(signalements),
    "## Les signalements, en entier",
    "",
    ...signalements.flatMap(rendreLeDepot),
  ].join("\n");
}
