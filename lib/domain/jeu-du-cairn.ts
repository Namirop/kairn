/**
 * Les règles du cairn à empiler, pendant que le dépôt travaille.
 *
 * Ce sont les seules décisions du jeu, et elles sont ici parce qu'elles se
 * vérifient : une pierre qui traverse son cadre ou une tolérance qui varie d'un
 * rang à l'autre ne se voient pas à l'œil sur une animation, mais se démontrent
 * en une propriété.
 *
 * **Le jeu occupe l'attente entière, pas une de ses phases.** Le découpage rend
 * en 6 secondes de médiane, l'écriture des questions en 20 : mesuré à un moment
 * plutôt qu'à l'autre, un occupant clignote ou se coupe au changement d'étape.
 * Celui-ci démarre au dépôt et vit jusqu'à ce que tout soit là — il ignore les
 * phases, donc elles ne peuvent pas l'interrompre.
 *
 * **Le cairn peut tomber**, et il faut alors le reprendre du sol : un
 * empilement où tout tient quoi qu'on fasse n'est pas un empilement, c'est une
 * liste qui se remplit. Depuis le 30/08, la visée se paie aussi — voir
 * `score-du-cairn.ts`, qui compte les trois fins ci-dessous. Rien n'en sort :
 * le score ne quitte pas la page, ne se garde pas d'une visite à l'autre, et le
 * dépôt qui tourne derrière ne s'en aperçoit pas. L'enjeu s'arrête à la pile
 * elle-même, ce qui est déjà l'enjeu d'un vrai cairn.
 */

/**
 * Assez pour occuper l'attente sans devenir une tâche à finir.
 *
 * Le compte décide aussi de la silhouette, et c'est par là qu'il s'est arrêté
 * ici. Six pierres donnaient un empilement large et bas, qui tenait dans une
 * vignette carrée à côté d'une colonne haute : le cairn y ressemblait à un
 * bouton. Neuf donnaient une tour élancée, plus une tour qu'un cairn. Sept
 * garde l'affinement visible du bas vers le haut tout en montant assez pour
 * qu'une colonne étroite lui aille.
 */
export const PIERRES_DU_JEU = 7;

/**
 * L'écart toléré, en unités de la vue de largeur 100.
 *
 * **Ce n'est plus la tolérance d'un jeu qu'on gagne distraitement, c'est celle
 * d'une visée.** Elle valait quatre unités, choisies quand poser n'était pas
 * compté : la pierre se calait sur sa marque au moindre passage dans la zone, et
 * le jeu se réussissait sans regarder. Depuis que la visée vaut deux points
 * contre un — voir `score-du-cairn.ts` —, une tolérance généreuse donne la
 * meilleure note à qui n'a rien visé, et la note ne dit plus rien.
 *
 * La valeur est mesurée, pas choisie au jugé. La fenêtre de temps où la pierre
 * est dans la zone vaut `2 × tolérance × période ÷ course`, et la course
 * s'élargit pendant que la période raccourcit : à quatre unités, elle allait de
 * 229 ms sur la pierre du bas à 94 ms sur celle du haut — de quoi appuyer au
 * hasard. À deux et demie, elle va de 143 ms à 58 ms : il faut suivre la pierre.
 *
 * **Rater la visée ne fait toujours pas perdre.** La chute se mesure depuis la
 * pierre du dessous, à quatorze unités (`SEUIL_DE_CHUTE`), et ce seuil-là n'a
 * pas bougé. Quelqu'un qui pose à peu près monte ses sept pierres comme avant,
 * un point chacune. Ce qui a changé n'est pas la difficulté du cairn, c'est le
 * prix de la note pleine.
 */
export const TOLERANCE = 2.5;

/**
 * L'écart au-delà duquel la pierre ne repose plus sur celle du dessous.
 *
 * Il ne se mesure **pas** depuis le pointillé mais depuis la pierre qui porte :
 * c'est elle qui la retient, et une pile qui zigzague finit par ne plus rien
 * porter du tout. Poser de travers ne coûte donc rien sur le coup et tout au
 * coup suivant, ce qui est exactement le comportement d'un empilement.
 *
 * La valeur vient de la géométrie, pas d'un réglage au jugé. La course de la
 * pierre va de vingt et une unités de part et d'autre au premier rang à
 * trente-deux au dernier — les pierres s'affinent en montant, donc elles ont
 * plus de place pour aller —, et la période tombe de 2400 ms à 1500. Quatorze
 * unités laissent 800 ms de fenêtre sûre en bas et 330 en haut : de quoi monter
 * les sept en regardant, jamais en tapant au hasard.
 */
export const SEUIL_DE_CHUTE = 14;

/** Aller-retour du balancier au premier rang, puis au dernier. */
const PERIODE_PREMIERE_MS = 2400;
const PERIODE_DERNIERE_MS = 1500;

/**
 * Le balancier accélère en montant, à peine.
 *
 * Sans rien, les six pierres se posent au même rythme et le jeu n'a pas de
 * fin — juste un arrêt. Avec, la dernière demande un peu plus d'attention que
 * la première, ce qui suffit à faire une montée. On reste loin d'une difficulté :
 * la tolérance, elle, ne bouge pas.
 */
export function periodeDuRang(rang: number, total: number = PIERRES_DU_JEU): number {
  if (total <= 1) return PERIODE_PREMIERE_MS;

  const avancee = Math.min(Math.max(rang, 0), total - 1) / (total - 1);

  return PERIODE_PREMIERE_MS + (PERIODE_DERNIERE_MS - PERIODE_PREMIERE_MS) * avancee;
}

/**
 * Où se trouve la pierre qui va et vient, à l'instant `temps`.
 *
 * Une onde triangulaire et non une sinusoïde : une sinusoïde ralentit aux deux
 * bouts, si bien que la pierre s'attarde exactement là où l'on ne veut pas la
 * poser et file au milieu, qui est la seule position utile. À vitesse
 * constante, chaque position vaut son temps.
 *
 * `temps` est une durée écoulée en millisecondes, pas une horloge : la fonction
 * reste pure et se rejoue à l'identique dans un test.
 */
export function positionDuBalancier(
  temps: number,
  periode: number,
  min: number,
  max: number,
): number {
  if (periode <= 0 || max <= min) return min;

  const phase = (((temps % periode) + periode) % periode) / periode;
  // Deux moitiés : on va de `min` à `max`, puis on revient.
  const montee = phase < 0.5 ? phase * 2 : 2 - phase * 2;

  return min + (max - min) * montee;
}

/** Ce qu'il advient d'une pierre lâchée. */
export type Pose = "DAPLOMB" | "DE_TRAVERS" | "TOMBEE";

export type PierrePosee = {
  /** L'abscisse où elle repose vraiment, dans la vue de largeur 100. */
  x: number;
  pose: Pose;
};

/**
 * Ce que devient une pierre lâchée à `x`, alors que le pointillé l'attendait à
 * `cible` et que `appui` porte l'abscisse de ce qui la reçoit — la pierre du
 * dessous, ou la marque au sol pour la première.
 *
 * **Trois fins, dans cet ordre.**
 *
 * Dans la tolérance du pointillé, elle se **cale** sur la cible plutôt que de
 * rester où elle est : à trois unités près, une pierre qui reste de travers
 * donne l'impression d'avoir raté alors qu'on a réussi. Le pointillé promet une
 * place, la réussite la donne exactement — et cette place-là tient toujours,
 * quelle que soit l'inclinaison de la pile. C'est ce qui empêche le jeu de
 * devenir déloyal : viser la marque annoncée ne peut jamais faire perdre, même
 * quand ce qui est dessous penche déjà.
 *
 * Sinon, elle tient tant qu'elle repose vraiment sur celle du dessous. Elle
 * reste où on l'a lâchée, de travers, et ça se voit.
 *
 * Au-delà, plus rien ne la porte : elle tombe, et le cairn avec elle. C'est la
 * seule façon de perdre, et elle demande de s'être écarté deux fois — une fois
 * pour poser de travers, une fois pour ne pas revenir.
 */
export function poserLaPierre(
  x: number,
  cible: number,
  appui: number,
  reglage: { tolerance?: number; seuil?: number } = {},
): PierrePosee {
  const tolerance = Math.max(0, reglage.tolerance ?? TOLERANCE);
  const seuil = Math.max(0, reglage.seuil ?? SEUIL_DE_CHUTE);

  if (Math.abs(x - cible) <= tolerance) return { x: cible, pose: "DAPLOMB" };

  return { x, pose: Math.abs(x - appui) <= seuil ? "DE_TRAVERS" : "TOMBEE" };
}
