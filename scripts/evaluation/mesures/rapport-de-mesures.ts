import { MODELE_DES_JUGES } from "../juges/modele";
import { rendementDuDoublon, type VerdictsDuDepot } from "../juges/verdicts";
import { MODELE_EMBEDDING } from "./espace";
import { rendreLesAttendus } from "./rendu-des-attendus";
import { rendreLeDepot } from "./rendu-des-signalements";
import { BANDE_DU_DOUBLON, PLANCHER_COUVERTURE, PLANCHER_DOUBLON, PLANCHER_SOUTIEN } from "./seuils";
import type { MesuresDuDepot } from "./signaux";
import { signaler, totaliser, type SignalementsDuDepot } from "./signalements";
import { rendreLesDeciles } from "./tableaux-de-calibration";

/**
 * L'agrégation du rapport « Mesures » : en-tête, tableau par dépôt, rendement
 * du juge du doublon par bande. Le détail par signalement est dans
 * `rendu-des-signalements.ts`.
 *
 * Les déciles restent en tête alors que les planchers sont posés, et c'est
 * volontaire : ce sont eux qui diront, d'un passage au suivant, si la
 * distribution a bougé sous les seuils. Un signalement qui double sans que la
 * distribution change dit autre chose qu'un signalement qui double parce que
 * tout le corpus a glissé.
 */

function nombre(valeur: number): string {
  return valeur.toLocaleString("fr-FR");
}

function trouverVerdicts(verdicts: VerdictsDuDepot[], nom: string): VerdictsDuDepot | undefined {
  return verdicts.find((v) => v.nom === nom);
}

type Comptes = {
  manquesReels: number;
  inventionsReelles: number;
  doublonsConfirmes: number;
  abstentions: number;
};

function comptes(
  signalements: SignalementsDuDepot[],
  verdicts: VerdictsDuDepot[],
): Comptes {
  const c: Comptes = {
    manquesReels: 0,
    inventionsReelles: 0,
    doublonsConfirmes: 0,
    abstentions: 0,
  };

  for (const signalement of signalements) {
    const verdict = trouverVerdicts(verdicts, signalement.nom);
    if (!verdict) continue;

    c.manquesReels += verdict.manques.filter((v) => v.retenir === true).length;
    c.inventionsReelles += verdict.inventions.filter((v) => v.soutenu === false).length;
    c.doublonsConfirmes += verdict.doublons.filter((v) => v.independants === false).length;

    c.abstentions += verdict.manques.filter((v) => v.retenir === null).length;
    c.abstentions += verdict.inventions.filter((v) => v.soutenu === null).length;
    c.abstentions += verdict.doublons.filter((v) => v.independants === null).length;
    c.abstentions += verdict.attendus.filter((v) => v.verdict?.couvert === null).length;
    for (const concept of verdict.fidelite) {
      c.abstentions += concept.questions.filter((v) => v.juste === null).length;
    }
  }

  return c;
}

function rendreLeTableau(
  signalements: SignalementsDuDepot[],
  verdicts: VerdictsDuDepot[],
): string[] {
  const lignes = signalements.map((s) => {
    const verdict = trouverVerdicts(verdicts, s.nom);
    const rendu = (candidats: number, confirmes: number | null): string =>
      confirmes === null ? nombre(candidats) : `${nombre(confirmes)} / ${nombre(candidats)}`;
    const manques = rendu(
      s.manques.length,
      verdict ? verdict.manques.filter((v) => v.retenir === true).length : null,
    );
    const inventions = rendu(
      s.inventions.length,
      verdict ? verdict.inventions.filter((v) => v.soutenu === false).length : null,
    );
    const doublons = rendu(
      s.doublons.length,
      verdict ? verdict.doublons.filter((v) => v.independants === false).length : null,
    );
    const radotage = s.radotage === null ? "—" : nombre(s.radotage.interConcepts.length);

    return `| \`${s.nom}\` | ${manques} / ${nombre(s.segments)} | ${inventions} / ${nombre(s.concepts)} | ${doublons} | ${radotage} |`;
  });

  return [
    "## Signalements par dépôt",
    "",
    "Format « retenus / candidats » quand le juge est passé, « candidats » seuls sinon. Un tiret n'est pas un zéro : c'est « non mesuré ».",
    "",
    "| Dépôt | Manques / phrases | Inventions / concepts | Doublons | Radotage |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...lignes,
    "",
  ];
}

function rendreLeRendementDuDoublon(
  signalements: SignalementsDuDepot[],
  verdicts: VerdictsDuDepot[],
): string[] {
  const rendement = rendementDuDoublon(signalements, verdicts);

  if (rendement.basse.candidats + rendement.haute.candidats === 0) return [];

  const taux = (bande: { candidats: number; confirmes: number }): string =>
    bande.candidats === 0 ? "—" : `${((bande.confirmes / bande.candidats) * 100).toFixed(0)} %`;

  return [
    "## Rendement du juge du doublon par bande",
    "",
    `C'est ce qui dira si le plancher à ${PLANCHER_DOUBLON} ramasse ce qu'il fallait. Si la bande basse rend peu, on resserre ; si elle rend autant que la haute, on ouvrirait dessous.`,
    "",
    "| Bande | Candidats | Confirmés | Rendement |",
    "| --- | ---: | ---: | ---: |",
    `| ${PLANCHER_DOUBLON} – ${BANDE_DU_DOUBLON} | ${nombre(rendement.basse.candidats)} | ${nombre(rendement.basse.confirmes)} | ${taux(rendement.basse)} |`,
    `| au-dessus de ${BANDE_DU_DOUBLON} | ${nombre(rendement.haute.candidats)} | ${nombre(rendement.haute.confirmes)} | ${taux(rendement.haute)} |`,
    "",
  ];
}

export type EnTeteDeMesures = {
  emisA: Date;
  source: string;
  dimension: number;
  calcules: number;
  enCache: number;
  tokens: number;
  /** Coût des juges pour ce passage, en dollars. Zéro si aucun juge n'a tourné. */
  coutDesJuges: number;
};

export function rendreLesMesures(
  mesures: MesuresDuDepot[],
  verdicts: VerdictsDuDepot[],
  entete: EnTeteDeMesures,
): string {
  const signalements = mesures.map(signaler);
  const total = totaliser(signalements);
  const confirmes = comptes(signalements, verdicts);
  const segments = mesures.reduce((cumul, mesure) => cumul + mesure.segments, 0);
  const concepts = mesures.reduce((cumul, mesure) => cumul + mesure.concepts, 0);
  const avecQuestions = mesures.filter((mesure) => mesure.radotage !== null).length;

  return [
    `# Mesures du corpus — ${entete.emisA.toISOString().slice(0, 16).replace("T", " ")} UTC`,
    "",
    `Embeddings \`${MODELE_EMBEDDING}\` · ${entete.dimension} dimensions · juges \`${MODELE_DES_JUGES}\``,
    "",
    entete.source,
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
      `**${nombre(confirmes.manquesReels)} manques** (sur ${nombre(total.manques)} candidats)`,
      `**${nombre(confirmes.inventionsReelles)} inventions** (sur ${nombre(total.inventions)} candidats)`,
      `**${nombre(confirmes.doublonsConfirmes)} doublons** (sur ${nombre(total.doublons)} candidats)`,
      confirmes.abstentions === 0
        ? "**0 abstention**"
        : `**${nombre(confirmes.abstentions)} abstentions** — items non rendus par un juge, à lire dans les sections détaillées`,
    ].join(" · "),
    "",
    `Vecteurs : ${nombre(entete.calcules)} calculés, ${nombre(entete.enCache)} lus au cache · ${nombre(entete.tokens)} tokens facturés · juges ${entete.coutDesJuges.toFixed(4)} $`,
    "",
    "Chaque signalement est un **candidat** ; le verdict du juge suit sous le rapproché.",
    "",
    ...rendreLesDeciles(mesures),
    ...rendreLeTableau(signalements, verdicts),
    ...rendreLeRendementDuDoublon(signalements, verdicts),
    ...rendreLesAttendus(verdicts),
    "## Les signalements, en entier",
    "",
    ...signalements.flatMap((signalement) =>
      rendreLeDepot(signalement, trouverVerdicts(verdicts, signalement.nom)),
    ),
  ].join("\n");
}
