/**
 * Géométrie de contact entre pierres, sans masse ni vitesse (la réponse aux
 * contacts vit dans `cairn-resolution`).
 *
 * Une pierre est un rectangle orienté : son dessin irrégulier n'en diffère que
 * de fractions d'unité. Repère du viewBox : `y` croît vers le bas, le sol est
 * `y = 0`, une pierre posée a un `y` négatif.
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
 * Les bords entre lesquels les pierres tombent, en unités de viewBox. Le cairn
 * de la page publique n'en a pas (`SANS_BORDS`).
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
 * À chevauchement égal, le premier axe gagne : sans ce tri, A–B et B–A se
 * repousseraient dans deux directions différentes. Le sens se décide après, sur
 * l'écart des centres.
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
 * Contacts entre deux pierres, par le théorème de l'axe séparateur : le plus
 * petit chevauchement donne la normale. Les points de contact sont les sommets
 * de l'une pris dans l'autre ; une pierre à plat en donne deux, ce qui
 * l'empêche d'osciller comme une bascule.
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
 * Contacts avec le sol : les sommets passés sous `y = 0`, et non la
 * demi-hauteur, pour qu'une pierre inclinée touche par son coin le plus bas.
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
