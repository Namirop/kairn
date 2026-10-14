import { PlanDuPaysage } from "./paysage/plan-du-paysage";
import { PLANS, PLANS_TELEPHONE } from "./paysage/plans";

/**
 * Le paysage de l'ouverture : deux terrasses de terrain, peuplées de cairns.
 *
 * Le hero posait autrefois un second cairn sur sa ligne de sol, et disait déjà
 * pourquoi : un cairn seul est une image ; deux cairns sur une même ligne
 * d'horizon sont un sentier, et le sentier est ce que le produit raconte. Une
 * rangée de cairns alignés sur une seule ligne ne le racontait pas pour autant
 * — elle donnait sept objets côte à côte, à plat. Il manquait les trois choses
 * qui font qu'une image a de la profondeur, et elles sont ici.
 *
 * **Un. Chaque plan a sa propre ligne d'appui.** Ce qui est loin est haut dans
 * l'image, ce qui est proche est bas : c'est ce qui range un paysage, et une
 * ligne unique l'interdisait.
 *
 * **Deux. Chaque plan dessine ses cairns, puis son sol par-dessus.** Un cairn
 * dont le pied disparaît sous la terre est planté ; un cairn posé sur une ligne
 * flotte. L'occlusion est l'indice de profondeur le plus fort qui existe, et
 * c'était le seul qui manquait complètement. Le sol de l'ouverture se pose en
 * dernier par-dessus l'ensemble : il devient le plan le plus proche et mord à
 * son tour la base de ce qui est derrière lui.
 *
 * **Le papier est devenu le ciel, et c'est une variable.** La brume ne rend pas
 * une pierre pâle, elle la rapproche de la couleur du ciel : tout ce fichier
 * mêlait donc déjà vers `--surface-papier`, qui *était* le ciel. Il mêle
 * maintenant vers `--ciel-teinte`, qui vaut le papier tant qu'aucune palette
 * n'en décide autrement — le dessin ne change pas d'un pixel, il cesse
 * seulement de supposer que le ciel est blanc.
 *
 * **Trois. Le recul se joue en contraste, pas en transparence.** La brume ne
 * rend pas les choses transparentes, elle les rapproche de la couleur du ciel :
 * un cairn lointain n'est pas un cairn pâle posé sur du papier, c'est un cairn
 * dont l'encre a déjà viré au papier. D'où le `color-mix` partout et l'absence
 * totale d'`opacity` — le fond ne transparaît pas au travers, il a mangé la
 * matière.
 *
 * **Sur téléphone, le même paysage descend sous le titre.** Il n'y paraissait
 * pas du tout, et pour une raison qui tenait : posés à leur hauteur de bureau,
 * ces plans se glissent sous le titre au lieu de s'éloigner — les crêtes
 * traversent « Tu lis beaucoup. », et la seconde ligne étant évidée, la pierre
 * passe *au travers* des lettres. Mais l'absence coûtait plus que le défaut :
 * le cairn de l'ouverture se retrouvait posé sur du vide, sur le seul écran où
 * il est la première chose qu'on voit.
 *
 * La réponse n'est pas de montrer le paysage de bureau en plus petit. Trois
 * choses changent, et chacune répare un défaut que la mise à l'échelle aurait
 * gardé — voir `PLANS_TELEPHONE` dans `paysage/plans.ts`.
 */

/**
 * Le paysage, dans celle de ses deux versions que l'écran appelle.
 *
 * Les deux sont montées et l'affichage en choisit une. C'est du SVG inerte,
 * sans image ni mesure au montage : le coût de celle qu'on ne voit pas est le
 * balisage lui-même, et il achète de ne jamais avoir de paysage en retard d'une
 * rotation d'écran.
 */
export function PaysageDeCairns() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 md:hidden">
        {PLANS_TELEPHONE.map((plan, rang) => (
          <PlanDuPaysage key={plan.crete} plan={plan} graine={`paysage-tel-${rang}`} />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 hidden md:block">
        {PLANS.map((plan, rang) => (
          <PlanDuPaysage key={plan.crete} plan={plan} graine={`paysage-${rang}`} />
        ))}
      </div>
    </>
  );
}
