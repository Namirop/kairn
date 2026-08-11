import {
  contactsAvecLeCadre,
  contactsAvecLeSol,
  contactsEntre,
  type Cadre,
  type Contact,
} from "./cairn-collision";
import { appliquer, masseEffective, monde, vitesseAuPoint, type Mobile } from "./cairn-impulsions";

/**
 * Résolution des contacts, par impulsions successives.
 *
 * C'est ce qui manquait : chaque pierre tombait seule, ne connaissait que le
 * sol, et finissait à cheval sur ses voisines sans jamais les avoir vues. Ici
 * les pierres se poussent, se frottent et s'empilent — un éboulis, pas six
 * chutes parallèles.
 *
 * La méthode est celle des solveurs à impulsions : à chaque image on liste les
 * contacts, puis on corrige les vitesses relatives plusieurs fois de suite. Une
 * seule passe laisserait une pierre du haut traverser celle du bas ; il en faut
 * une quinzaine pour qu'une pile de sept tienne sans trembler, parce qu'une
 * correction ne se propage que d'un étage à la fois.
 *
 * `resoudre` écrit dans les mobiles qu'on lui donne. Ce n'est pas un effet de
 * bord caché : ils sont fabriqués pour l'image en cours par `avancer`, qui reste
 * pur pour l'extérieur. Recopier vingt fois sept corps par image pour tenir la
 * lettre d'une règle qui vise l'état partagé serait payer cher un principe mal
 * appliqué.
 */

/** Part de vitesse rendue à l'impact. Une pierre ne rebondit presque pas. */
const REBOND = 0.04;
/** Coefficient de Coulomb : ce que le contact peut retenir de côté. */
const FROTTEMENT = 0.42;
/** Part de l'enfoncement rattrapée par passe. Tout d'un coup ferait sauter. */
const CORRECTION = 0.4;
/** Enfoncement toléré, en unités de viewBox. Sans lui, les contacts vibrent. */
const JEU = 0.08;
const ITERATIONS = 16;
/** Passes de position, avec relevé neuf des contacts entre chacune. */
const PASSES_DE_POSITION = 6;

type Lien = { a: Mobile; b: Mobile; contact: Contact };

/**
 * Ce qu'un mobile touche, et de combien il est entré dedans.
 *
 * L'appelant s'en sert pour décider du repos. Les deux comptent : une pierre
 * lente sans appui est au sommet d'un rebond, et une pierre lente encore
 * enfoncée d'une unité n'a pas fini d'être ressortie. L'endormir dans l'un ou
 * l'autre cas fige une image fausse.
 */
export type Appui = { touche: boolean; enfoncement: number };

function corrigerVitesses(lien: Lien): void {
  const { a, b, contact } = lien;
  const normale = contact.normale;
  const relative = () => {
    const va = vitesseAuPoint(a, contact.point);
    const vb = vitesseAuPoint(b, contact.point);

    return { x: vb.x - va.x, y: vb.y - va.y };
  };

  const rapprochement = relative();
  const vn = rapprochement.x * normale.x + rapprochement.y * normale.y;

  // Positif : B s'éloigne déjà de A, il n'y a rien à corriger.
  if (vn > 0) return;

  const kn = masseEffective(a, b, contact.point, normale);

  if (kn <= 0) return;

  const jn = (-(1 + REBOND) * vn) / kn;
  appliquer(b, contact.point, normale.x * jn, normale.y * jn);
  appliquer(a, contact.point, -normale.x * jn, -normale.y * jn);

  // Le frottement se calcule après la normale : il est borné par elle, et une
  // pierre qui appuie fort glisse moins qu'une pierre qui effleure.
  const tangente = { x: -normale.y, y: normale.x };
  const glissement = relative();
  const vt = glissement.x * tangente.x + glissement.y * tangente.y;
  const kt = masseEffective(a, b, contact.point, tangente);

  if (kt <= 0) return;

  const borne = FROTTEMENT * jn;
  const jt = Math.max(-borne, Math.min(borne, -vt / kt));
  appliquer(b, contact.point, tangente.x * jt, tangente.y * jt);
  appliquer(a, contact.point, -tangente.x * jt, -tangente.y * jt);
}

/** Écarte ce qui s'est enfoncé. Sur la position, jamais sur la vitesse. */
function corrigerPositions(lien: Lien): void {
  const { a, b, contact } = lien;
  const total = a.masseInverse + b.masseInverse;
  const exces = Math.max(contact.penetration - JEU, 0);

  if (total <= 0 || exces === 0) return;

  const poussee = (exces * CORRECTION) / total;
  b.boite.x += contact.normale.x * poussee * b.masseInverse;
  b.boite.y += contact.normale.y * poussee * b.masseInverse;
  a.boite.x -= contact.normale.x * poussee * a.masseInverse;
  a.boite.y -= contact.normale.y * poussee * a.masseInverse;
}

function lister(mobiles: Mobile[], cadre: Cadre): { liens: Lien[]; appuis: Appui[] } {
  const sol = monde();
  const liens: Lien[] = [];
  const appuis: Appui[] = mobiles.map(() => ({ touche: false, enfoncement: 0 }));
  const poser = (a: Mobile, b: Mobile, contacts: Contact[], gauche: number, droit: number) => {
    for (const contact of contacts) {
      liens.push({ a, b, contact });

      for (const index of [gauche, droit]) {
        const appui = appuis[index];
        if (index < 0 || !appui) continue;

        appui.touche = true;
        appui.enfoncement = Math.max(appui.enfoncement, contact.penetration);
      }
    }
  };

  mobiles.forEach((mobile, index) => {
    if (mobile.masseInverse === 0) return;

    poser(sol, mobile, contactsAvecLeSol(mobile.boite), -1, index);
    poser(sol, mobile, contactsAvecLeCadre(mobile.boite, cadre), -1, index);
  });

  for (let i = 0; i < mobiles.length; i += 1) {
    for (let j = i + 1; j < mobiles.length; j += 1) {
      const a = mobiles[i];
      const b = mobiles[j];

      if (!a || !b || (a.masseInverse === 0 && b.masseInverse === 0)) continue;

      poser(a, b, contactsEntre(a.boite, b.boite), i, j);
    }
  }

  return { liens, appuis };
}

/**
 * Résout tous les contacts d'une image, et rend l'appui de chaque mobile.
 *
 * Les positions se corrigent en plusieurs passes, en refaisant la liste des
 * contacts entre chacune. Une passe unique ne remontait l'écartement que d'un
 * étage par image : dans une pile de six, la pierre du bas restait enfoncée de
 * deux unités dans le sol pendant que tout le reste avait l'air posé. Refaire
 * la liste est ce qui coûte, et pour sept pierres ça ne coûte rien.
 *
 * L'appui rendu mélange les deux bouts, et c'est voulu : le contact vient du
 * relevé d'entrée, l'enfoncement du relevé de sortie. Tout prendre à la sortie
 * faisait qu'une pierre bien dégagée par la correction se retrouvait sans
 * contact du tout — donc jamais posée, donc en vol perpétuel à un centième
 * d'unité par seconde, et la boucle d'animation ne s'arrêtait plus.
 */
export function resoudre(mobiles: Mobile[], cadre: Cadre): Appui[] {
  const entree = lister(mobiles, cadre);
  let sortie = entree;

  for (let tour = 0; tour < ITERATIONS; tour += 1) {
    for (const lien of entree.liens) corrigerVitesses(lien);
  }

  for (let tour = 0; tour < PASSES_DE_POSITION; tour += 1) {
    for (const lien of sortie.liens) corrigerPositions(lien);
    sortie = lister(mobiles, cadre);
  }

  return entree.appuis.map((appui, index) => ({
    touche: appui.touche,
    enfoncement: sortie.appuis[index]?.enfoncement ?? 0,
  }));
}
