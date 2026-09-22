/**
 * Ce qu'on dit pendant que ça travaille, et comment le ton change avec le temps.
 *
 * L'essai est le moment le plus fragile du produit : la seule page qui
 * convertit, et deux délais qu'on ne maîtrise pas. Mesurés sur trois semaines de
 * production, le découpage va de 2,5 à 15 secondes, l'écriture des questions
 * jusqu'à une quarantaine. Un écran qui répète la même phrase pendant quarante
 * secondes a l'air figé ; un écran qui promet « quelques secondes » à la
 * trentième ment.
 *
 * **Le ton suit donc le temps, et il descend.** Au début on dit ce qu'on fait.
 * Passé quelques secondes on reconnaît que ça dure. Plus loin on en rit à ses
 * propres dépens — c'est la seule chose honnête qui reste à dire, et c'est
 * beaucoup plus tenable qu'un tourniquet muet. Au dernier palier on arrête de
 * plaisanter : ce qui compte alors, c'est que fermer l'onglet ne coûte rien.
 *
 * **Deux étapes, deux catalogues, et ce n'est pas un détail.** Le découpage
 * parle à quelqu'un qui n'a encore rien vu ; l'écriture parle à quelqu'un dont
 * les concepts sont déjà à l'écran, donc déjà à moitié convaincu et beaucoup
 * moins inquiet. Servir « on lit ce que tu as déposé » pendant qu'on écrit les
 * questions serait faux au mot près, et le mot est tout ce qu'on a ici.
 *
 * **L'auto-dérision reste dans le registre du produit.** Pince-sans-rire, sans
 * point d'exclamation, sans emoji, sans excuse. On se moque du travail en cours,
 * jamais de celui qui attend — et on ne le félicite de rien. Les tests en font
 * une règle mécanique plutôt qu'une bonne intention.
 *
 * **Le temps mesuré est celui du regard, pas celui du travail.** Il repart de
 * zéro à chaque affichage de l'écran, et c'est voulu : quelqu'un qui recharge la
 * page sur une extraction déjà vieille d'une minute vient, lui, d'arriver.
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

/** Les deux temps de l'essai, qui ne durent pas pareil et ne parlent pas pareil. */
export type EtapeDeLAttente = "DECOUPAGE" | "ECRITURE";

/**
 * Un palier de ton, et ce qu'on y dit.
 *
 * Deux phrases au minimum, et c'est le **type** qui l'impose : un palier d'une
 * seule phrase est un palier qui se répète, ce qui est précisément le défaut
 * qu'on répare ici. Le tuple garantit au passage qu'il y a toujours une phrase à
 * rendre, sans jamais forcer un type.
 */
type Palier = {
  /** À partir de quand ce palier parle. */
  depuisMs: number;
  phrases: readonly [string, string, ...string[]];
};

/**
 * Les bornes des quatre paliers, communes aux deux étapes.
 *
 * Elles ne sont pas rondes par hasard. Huit secondes, c'est la médiane du
 * découpage plus une marge : en dessous, reconnaître que « c'est long » serait
 * faux. Vingt, c'est là où plus personne ne croit à « quelques secondes ».
 * Quarante-cinq, c'est au-delà de tout ce qu'on a mesuré en production — on n'a
 * plus rien à promettre, seulement à rassurer. Le dernier palier tient jusqu'à
 * l'abandon, à quatre-vingt-dix secondes, où un autre écran prend la main.
 *
 * **Une borne est atteinte à la relève suivante, pas à la seconde près.** Un
 * appelant qui interroge toutes les relèves passe de sept secondes à dix et
 * demie : le palier des huit secondes commence donc pour lui à dix et demie.
 * C'est le prix à payer pour qu'aucune phrase ne soit remplacée une seconde
 * après être apparue — un clignotement se voit, trois secondes de décalage non.
 */
const BORNES = [0, 8_000, 20_000, 45_000] as const;

type Catalogue = readonly [
  Palier["phrases"],
  Palier["phrases"],
  Palier["phrases"],
  Palier["phrases"],
];

/** Le découpage : on parle à quelqu'un qui n'a encore rien vu. */
const DECOUPAGE: Catalogue = [
  [
    "On lit ce que tu as déposé.",
    "On cherche les idées qui tiennent toutes seules.",
    "On met de côté ce qui n'a pas à être retenu.",
  ],
  [
    "Il y a de la matière, visiblement.",
    "C'est un peu plus long que d'habitude.",
    "On relit. Certains passages se discutent.",
  ],
  [
    "Le découpage prend son temps. Il n'est pas pressé.",
    "On a déjà vu des cairns se monter plus vite.",
    "Toujours dessus. On ne s'était engagés sur rien.",
    "À ce stade, on relit par principe.",
  ],
  [
    "On ne promet plus de date.",
    "Tu peux fermer l'onglet, ça continue sans toi.",
    "Ton texte est en lieu sûr. Il t'attendra ici.",
  ],
];

/**
 * L'écriture : on parle à quelqu'un qui voit déjà ses concepts.
 *
 * Le ton part donc plus léger — la preuve est faite, il ne manque qu'un
 * échantillon — et le dernier palier rappelle que le lot est déjà acquis. C'est
 * la différence qui compte à cette étape : ce n'est plus l'essai qui est en jeu.
 */
const ECRITURE: Catalogue = [
  [
    "On cherche par quel bout te le redemander.",
    "Une même idée, plusieurs façons de la demander.",
    "On formule, puis on reformule.",
  ],
  [
    "On en écrit quatre, pas une.",
    "On évite les questions qui donnent la réponse.",
    "Celle-ci mérite mieux qu'un vrai ou faux.",
  ],
  [
    "L'écriture est plus lente que le découpage.",
    "On hésite sur un mot. Ça arrive.",
    "Toujours en train de choisir les mots.",
  ],
  [
    "Tes concepts sont gardés. C'est l'échantillon qui traîne.",
    "Tu peux fermer, on continue de notre côté.",
    "Là, on n'a plus vraiment d'explication.",
  ],
];

const CATALOGUES: Record<EtapeDeLAttente, Catalogue> = {
  DECOUPAGE,
  ECRITURE,
};

/** Les paliers d'une étape, bornes comprises. Sert aux tests et à la relecture. */
export function paliersDe(etape: EtapeDeLAttente): readonly [Palier, ...Palier[]] {
  const [un, deux, trois, quatre] = CATALOGUES[etape];

  return [
    { depuisMs: BORNES[0], phrases: un },
    { depuisMs: BORNES[1], phrases: deux },
    { depuisMs: BORNES[2], phrases: trois },
    { depuisMs: BORNES[3], phrases: quatre },
  ];
}

export const ETAPES: readonly EtapeDeLAttente[] = ["DECOUPAGE", "ECRITURE"];

/**
 * La phrase à afficher, pour une étape, un temps d'attente et un tirage donnés.
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
export function phraseDattente(etape: EtapeDeLAttente, ecouleMs: number, tirage: number): string {
  const depuis = Math.max(0, ecouleMs);
  const paliers = paliersDe(etape);
  const rang = Math.floor(depuis / RELEVE_MS);

  let palier = paliers[0];

  for (const candidat of paliers) {
    if (depuis >= candidat.depuisMs) palier = candidat;
  }

  const borne = Math.min(Math.max(tirage, 0), 1 - Number.EPSILON);
  const decalage = Math.floor(borne * palier.phrases.length);

  // `rang` et `decalage` sont positifs, donc l'index l'est aussi et tombe
  // toujours dans le tuple. Le repli sur la première phrase est là pour le
  // typage, pas pour un cas réel.
  return palier.phrases[(rang + decalage) % palier.phrases.length] ?? palier.phrases[0];
}
