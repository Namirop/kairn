/**
 * Combien de concepts jamais vus la session du jour accepte.
 *
 * **Le plafond de session borne le volume, il ne borne pas ce qui entre.** Un
 * concept jamais revu porte une urgence infinie — c'est `retardRelatif`, et
 * c'est juste : jamais retrouvé une seule fois, c'est la définition de fragile.
 * Mais son échéance est posée à l'instant du dépôt. Quelqu'un qui colle trois
 * articles un dimanche a donc soixante concepts neufs, tous dus, tous infinis :
 * pendant plusieurs jours sa session est faite à cent pour cent de neuf, et
 * **tout ce qu'il révisait déjà est repoussé**. Le compteur reste à vingt,
 * l'écran ne montre rien d'anormal, et la répétition espacée s'arrête pendant
 * qu'on apprend.
 *
 * C'est le mode d'échec classique d'un import massif, et le plafond de session
 * n'en protège pas : il plafonne le total, là où il faudrait plafonner l'entrée.
 *
 * **La part est une proportion, jamais un nombre.** Le plafond de session n'est
 * pas vingt : c'est son défaut, et l'utilisateur le règle entre cinq et
 * cinquante. Une constante en dur autoriserait plus de neuf que la session
 * entière chez l'un, et brimerait chez l'autre quelqu'un qui a demandé de la
 * charge exprès.
 *
 * **Le neuf prend aussi ce que la révision ne réclame pas**, et sans cette
 * seconde règle la première ferait pire que le mal : un compte qui vient de
 * s'inscrire n'a rien à réviser, et se verrait servir huit concepts sur une
 * session de vingt — un écran à moitié vide le jour où l'on découvre le produit.
 *
 * Ce que la journée sert au total ne change pas : c'est toujours le plafond, ou
 * tout ce qui est dû s'il y en a moins. Seule la composition change. Le tableau
 * de bord, qui ne compte que des nombres, n'a rien à réapprendre.
 */

/**
 * La part de la session ouverte au neuf quand la révision se bouscule.
 *
 * Deux cinquièmes : assez pour qu'un dépôt de cinquante concepts entre en une
 * semaine et demie plutôt qu'en deux jours, assez peu pour laisser la majorité
 * des places à ce qui est en train d'être oublié. Le rapport tient à toutes les
 * échelles du réglage — deux places sur cinq, huit sur vingt, vingt sur
 * cinquante.
 */
export const PART_NEUVE = 0.4;

/**
 * Les places que le neuf peut prendre.
 *
 * Le maximum des deux règles : sa part garantie, et tout ce que la révision
 * laisse. Jamais plus que le plafond, puisque les deux termes y sont bornés.
 *
 * Au moins une place dès que la session en a une : une part arrondie à zéro
 * arrêterait l'introduction pour toujours, et un concept qui n'entre jamais ne
 * vaut pas mieux qu'un concept perdu.
 */
export function placesPourLeNeuf(plafond: number, revusDisponibles: number): number {
  const borne = Math.max(0, plafond);

  if (borne === 0) return 0;

  const garantie = Math.max(1, Math.round(borne * PART_NEUVE));

  return Math.max(garantie, borne - Math.max(0, revusDisponibles));
}

/**
 * Ce que la session retient, la part de neuf bornée.
 *
 * Les candidats arrivent **déjà triés par urgence**, et l'ordre est conservé :
 * ce module choisit qui passe, jamais dans quel ordre. L'alternance des sujets
 * s'applique après, comme avant.
 *
 * Le neuf sert d'abord, dans la limite de ses places ; la révision remplit le
 * reste. Aucune place ne se perd — quand un des deux camps est trop court,
 * l'autre prend ce qui traîne.
 */
export function bornerLeNeuf<T extends { lastReview: Date | null }>(
  candidats: readonly T[],
  plafond: number,
): T[] {
  const borne = Math.max(0, plafond);

  if (candidats.length <= borne) return [...candidats];

  const neufs = candidats.filter((candidat) => candidat.lastReview === null);
  const revus = candidats.filter((candidat) => candidat.lastReview !== null);

  const retenus = new Set<T>(neufs.slice(0, placesPourLeNeuf(borne, revus.length)));

  for (const revu of revus) {
    if (retenus.size >= borne) break;

    retenus.add(revu);
  }

  return candidats.filter((candidat) => retenus.has(candidat));
}
