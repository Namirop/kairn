/**
 * Géométrie de contact entre pierres.
 *
 * Une pierre est traitée comme un rectangle orienté. Son dessin a des coins
 * mordus et des flancs pincés, mais la différence se compte en fractions
 * d'unité : le rectangle est ce qui décide où elle s'arrête, le chemin est ce
 * qu'on regarde.
 *
 * Fonctions pures, sans notion de masse ni de vitesse. Savoir que deux pierres
 * se chevauchent et savoir comment elles se repoussent sont deux questions
 * distinctes : la seconde vit dans `cairn-resolution`.
 *
 * Le repère est celui du viewBox : `y` croît **vers le bas**, le sol est le plan
 * `y = 0`. Une pierre posée a donc un `y` négatif, et un point sous le sol a un
 * `y` positif.
 */

export type Vecteur = { x: number; y: number };

export type Boite = {
  x: number;
  y: number;
  /** Degrés, dans le sens du `rotate` SVG. */
  rotation: number;
  largeur: number;
  hauteur: number;
};

export type Contact = {
  point: Vecteur;
  /** Unitaire, dirigée de A vers B : le sens dans lequel B doit s'écarter. */
  normale: Vecteur;
  penetration: number;
};

/**
 * Les bords entre lesquels les pierres tombent, en unités de viewBox.
 *
 * Le cairn du tableau de bord n'a pas à quitter son dessin. Celui de la page
 * publique, si : l'enfermer dans la largeur de son propre SVG le faisait
 * rebondir sur des murs qu'on ne voyait pas, ni contenu ni libre.
 */
export type Cadre = { gauche: number; droite: number };

/** Deux contacts suffisent à décrire un appui : au-delà, on sur-contraint. */
const CONTACTS_MAX = 2;

const QUARTS = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
] as const;

export function sommets(boite: Boite): Vecteur[] {
  const angle = (boite.rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return QUARTS.map(([u, v]) => {
    const dx = (u * boite.largeur) / 2;
    const dy = (v * boite.hauteur) / 2;

    return { x: boite.x + dx * cos - dy * sin, y: boite.y + dx * sin + dy * cos };
  });
}

/** Les deux normales de faces. Les deux autres leur sont opposées, donc inutiles. */
function axes(boite: Boite): Vecteur[] {
  const angle = (boite.rotation * Math.PI) / 180;

  return [
    { x: Math.cos(angle), y: Math.sin(angle) },
    { x: -Math.sin(angle), y: Math.cos(angle) },
  ];
}

/**
 * Les quatre axes à tester, dans un ordre indépendant de celui des deux pierres.
 *
 * Deux axes peuvent donner exactement le même chevauchement, et le premier
 * rencontré gagnait — or « le premier » changeait selon qu'on demandait A vers
 * B ou B vers A, si bien que la même paire se repoussait dans deux directions
 * différentes. Ramener chaque axe à un demi-plan puis trier rend le choix
 * stable ; le sens se décide après, sur l'écart des centres.
 */
function axesTestes(a: Boite, b: Boite): Vecteur[] {
  return [...axes(a), ...axes(b)]
    .map((axe) => (axe.y < 0 || (axe.y === 0 && axe.x < 0) ? { x: -axe.x, y: -axe.y } : axe))
    .sort((premier, second) => premier.x - second.x || premier.y - second.y);
}

function projeter(points: Vecteur[], axe: Vecteur): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;

  for (const point of points) {
    const distance = point.x * axe.x + point.y * axe.y;
    if (distance < min) min = distance;
    if (distance > max) max = distance;
  }

  return { min, max };
}

export function contient(boite: Boite, point: Vecteur): boolean {
  const angle = (-boite.rotation * Math.PI) / 180;
  const dx = point.x - boite.x;
  const dy = point.y - boite.y;
  const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
  const localY = dx * Math.sin(angle) + dy * Math.cos(angle);

  return Math.abs(localX) <= boite.largeur / 2 && Math.abs(localY) <= boite.hauteur / 2;
}

/**
 * Contacts entre deux pierres, par le théorème de l'axe séparateur.
 *
 * Le plus petit chevauchement donne la normale : c'est la direction où il y a
 * le moins à défaire pour les séparer, donc celle par laquelle elles se
 * touchent vraiment. Les points de contact sont les sommets de l'une pris à
 * l'intérieur de l'autre — une pierre posée à plat en donne deux, ses coins
 * bas, et c'est ce qui l'empêche d'osciller sur place comme une bascule.
 */
export function contactsEntre(a: Boite, b: Boite): Contact[] {
  const sommetsA = sommets(a);
  const sommetsB = sommets(b);
  let normale: Vecteur | null = null;
  let penetration = Infinity;

  for (const axe of axesTestes(a, b)) {
    const projA = projeter(sommetsA, axe);
    const projB = projeter(sommetsB, axe);
    const chevauchement = Math.min(projA.max, projB.max) - Math.max(projA.min, projB.min);

    if (chevauchement <= 0) return [];

    if (chevauchement < penetration) {
      penetration = chevauchement;
      normale = axe;
    }
  }

  if (!normale) return [];

  // Orientée de A vers B, quel que soit l'axe qui a gagné.
  const sens = (b.x - a.x) * normale.x + (b.y - a.y) * normale.y < 0 ? -1 : 1;
  const oriente = { x: normale.x * sens, y: normale.y * sens };

  const points = [
    ...sommetsB.filter((point) => contient(a, point)),
    ...sommetsA.filter((point) => contient(b, point)),
  ];

  // Chevauchement sans sommet dedans : deux pierres croisées en X, bref et
  // rare. Un contact au milieu suffit à les écarter.
  const retenus =
    points.length > 0
      ? points.slice(0, CONTACTS_MAX)
      : [{ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }];

  return retenus.map((point) => ({ point, normale: oriente, penetration }));
}

/**
 * Contacts avec le sol : les sommets passés sous le plan `y = 0`.
 *
 * La normale sort du sol, donc vers le haut. Prendre les sommets plutôt que la
 * demi-hauteur est ce qui empêche une pierre inclinée de s'enfoncer : c'est son
 * coin le plus bas qui touche, pas son centre.
 */
export function contactsAvecLeSol(boite: Boite): Contact[] {
  return sommets(boite)
    .filter((point) => point.y > 0)
    .sort((premier, second) => second.y - premier.y)
    .slice(0, CONTACTS_MAX)
    .map((point) => ({ point, normale: { x: 0, y: -1 }, penetration: point.y }));
}

/** Contacts avec les bords latéraux, s'il y en a. */
export function contactsAvecLeCadre(boite: Boite, cadre: Cadre): Contact[] {
  const points = sommets(boite);
  const contacts: Contact[] = [];
  const gauche = points.reduce((min, point) => (point.x < min.x ? point : min));
  const droite = points.reduce((max, point) => (point.x > max.x ? point : max));

  if (gauche.x < cadre.gauche) {
    contacts.push({
      point: gauche,
      normale: { x: 1, y: 0 },
      penetration: cadre.gauche - gauche.x,
    });
  }

  if (droite.x > cadre.droite) {
    contacts.push({
      point: droite,
      normale: { x: -1, y: 0 },
      penetration: droite.x - cadre.droite,
    });
  }

  return contacts;
}
