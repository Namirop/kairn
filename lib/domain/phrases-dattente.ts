/**
 * Ce qu'on dit pendant que le découpage tourne, et comment le ton change.
 *
 * L'attente de l'essai est le moment le plus fragile du produit : la seule page
 * qui convertit, et un délai qu'on ne maîtrise pas. Mesurée sur trois semaines
 * de production, elle va de 2,5 à 15 secondes pour le découpage, jusqu'à une
 * quarantaine pour l'écriture des questions. Un écran qui répète la même phrase
 * pendant quarante secondes a l'air figé ; un écran qui promet « quelques
 * secondes » à la trentième ment.
 *
 * **Le ton suit donc le temps, et il descend.** Au début on dit ce qu'on fait.
 * Passé quelques secondes on reconnaît que ça dure. Plus loin on en rit à ses
 * propres dépens — c'est la seule chose honnête qui reste à dire, et c'est
 * beaucoup plus tenable qu'un tourniquet muet. Au dernier palier on arrête de
 * plaisanter : ce qui compte alors, c'est que fermer l'onglet ne coûte rien.
 *
 * **L'auto-dérision reste dans le registre du produit.** Pince-sans-rire, sans
 * point d'exclamation, sans emoji, sans excuse. On se moque du découpage, jamais
 * de celui qui attend — et on ne le félicite de rien. Les tests en font une
 * règle mécanique plutôt qu'une bonne intention.
 *
 * **Le temps mesuré est celui du regard, pas celui du travail.** Il repart de
 * zéro à chaque affichage de l'écran, et c'est voulu : quelqu'un qui recharge la
 * page sur une extraction déjà vieille d'une minute vient, lui, d'arriver. Lui
 * servir « on ne promet plus de date » au premier coup d'œil serait absurde.
 *
 * Aucune horloge ici : l'instant écoulé est un paramètre, comme partout dans
 * `lib/domain/`.
 */

/**
 * Combien de temps une phrase reste à l'écran.
 *
 * Assez pour être lue sans effort, assez peu pour que l'écran ne paraisse pas
 * arrêté. En dessous de trois secondes on lit en se dépêchant ; au-delà de
 * quatre, le silence entre deux phrases redevient une attente immobile.
 */
export const RELEVE_MS = 3500;

/**
 * Un palier de ton, et ce qu'on y dit.
 *
 * Deux phrases au minimum, et c'est le **type** qui l'impose : un palier d'une
 * seule phrase est un palier qui se répète, ce qui est précisément le défaut
 * qu'on répare ici. Le tuple sert au passage à garantir qu'il y a toujours une
 * phrase à rendre, sans jamais forcer un type.
 */
type Palier = {
  /** À partir de quand ce palier parle. */
  depuisMs: number;
  phrases: readonly [string, string, ...string[]];
};

/**
 * Les quatre paliers, du plus factuel au plus résigné.
 *
 * Les bornes ne sont pas rondes par hasard. Huit secondes, c'est la médiane du
 * découpage plus une marge : en dessous, reconnaître que « c'est long » serait
 * faux. Vingt, c'est là où l'écriture des questions a commencé et où plus
 * personne ne croit à « quelques secondes ». Quarante-cinq, c'est au-delà de
 * tout ce qu'on a mesuré en production — on n'a plus rien à promettre, seulement
 * à rassurer.
 *
 * Le dernier palier tient jusqu'à l'abandon, à quatre-vingt-dix secondes, où un
 * autre écran prend la main.
 *
 * **Une borne est atteinte à la relève suivante, pas à la seconde près.** Un
 * appelant qui interroge toutes les relèves passe de sept secondes à dix et
 * demie : le palier des huit secondes commence donc pour lui à dix et demie.
 * C'est le prix à payer pour qu'aucune phrase ne soit remplacée une seconde
 * après être apparue, et c'est le bon côté du compromis — un clignotement se
 * voit, trois secondes de décalage non.
 */
const PALIERS: readonly [Palier, ...Palier[]] = [
  {
    depuisMs: 0,
    phrases: [
      "On lit ce que tu as déposé.",
      "On cherche les idées qui tiennent toutes seules.",
      "On met de côté ce qui n'a pas à être retenu.",
    ],
  },
  {
    depuisMs: 8_000,
    phrases: [
      "Il y a de la matière, visiblement.",
      "C'est un peu plus long que d'habitude.",
      "On relit. Certains passages se discutent.",
    ],
  },
  {
    depuisMs: 20_000,
    phrases: [
      "Le découpage prend son temps. Il n'est pas pressé.",
      "On a déjà vu des cairns se monter plus vite.",
      "Toujours dessus. On ne s'était engagés sur rien.",
      "À ce stade, on relit par principe.",
    ],
  },
  {
    depuisMs: 45_000,
    phrases: [
      "On ne promet plus de date.",
      "Tu peux fermer l'onglet, ça continue sans toi.",
      "Ton texte est en lieu sûr. Il t'attendra ici.",
    ],
  },
];

/** Les paliers, pour les tests et pour qui veut les relire d'un bloc. */
export const PALIERS_DATTENTE = PALIERS;

/** Le palier qui parle à cet instant de l'attente. */
function palierA(ecouleMs: number): Palier {
  let courant: Palier = PALIERS[0];

  for (const palier of PALIERS) {
    if (ecouleMs >= palier.depuisMs) courant = palier;
  }

  return courant;
}

/**
 * La phrase à afficher, pour un temps d'attente et un tirage donnés.
 *
 * `tirage` est un nombre entre 0 et 1, tiré une fois par attente — même
 * convention que `inviteDeDepot`. Il décale le point d'entrée dans chaque
 * palier, pour que deux attentes de la même durée ne racontent pas la même
 * chose : sans lui, quiconque dépose deux fois lit deux fois la même séquence.
 *
 * Le rang avance d'une phrase par relève, indépendamment du palier. C'est ce qui
 * fait qu'on ne relit jamais la même phrase deux relèves de suite, y compris
 * juste après un changement de palier.
 */
export function phraseDattente(ecouleMs: number, tirage: number): string {
  const depuis = Math.max(0, ecouleMs);
  const palier = palierA(depuis);
  const rang = Math.floor(depuis / RELEVE_MS);
  const borne = Math.min(Math.max(tirage, 0), 1 - Number.EPSILON);
  const decalage = Math.floor(borne * palier.phrases.length);

  // `rang` et `decalage` sont positifs, donc l'index l'est aussi et tombe
  // toujours dans le tuple. Le repli sur la première phrase est là pour le
  // typage, pas pour un cas réel.
  return palier.phrases[(rang + decalage) % palier.phrases.length] ?? palier.phrases[0];
}
