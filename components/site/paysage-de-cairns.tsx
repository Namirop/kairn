import { empiler, LARGEUR_VUE } from "@/lib/domain/cairn-stack";

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
 * gardé — voir `PLANS_TELEPHONE`.
 */

/** L'encre d'une pierre, diluée dans le papier à mesure qu'elle s'éloigne. */
const encre = (part: number) =>
  `color-mix(in oklab, var(--stone-500) ${part.toFixed(1)}%, var(--ciel-teinte))`;

/** Les trois nuances d'un cairn, dérivées de sa part d'encre. */
const teintesDe = (part: number): [string, string, string] => [
  encre(part),
  encre(part * 0.84),
  encre(part * 0.7),
];

/** La terre d'un plan, entre l'ombre et le papier. */
const terre = (part: number) =>
  `color-mix(in oklab, var(--terre) ${part.toFixed(0)}%, var(--ciel-teinte))`;

/**
 * Une ligne de crête, tracée dans l'espace commun aux deux plans.
 *
 * Les sept appuis ne sont pas répartis pareil d'un plan à l'autre : deux crêtes
 * qui ondulent au même rythme font des rayures, pas un relief. C'est le
 * décalage des creux qui donne l'impression que l'une passe derrière l'autre.
 */
function cheminDeCrete(y: number, appuis: number[]) {
  const pas = 1200 / (appuis.length - 1);
  const [premier, ...suite] = appuis.map((decalage, index) => ({
    x: index * pas,
    y: y + decalage,
  }));

  if (!premier) return { ligne: "", masse: "" };

  let precedent = premier;
  let ligne = `M0,${premier.y.toFixed(1)}`;

  for (const point of suite) {
    ligne +=
      ` C${(precedent.x + pas * 0.45).toFixed(1)},${precedent.y.toFixed(1)}` +
      ` ${(point.x - pas * 0.45).toFixed(1)},${point.y.toFixed(1)}` +
      ` ${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    precedent = point;
  }

  return { ligne, masse: `${ligne} L1200,1000 L0,1000 Z` };
}

type Plan = {
  /** Hauteur de la crête, en fraction de la hauteur du panneau. */
  crete: number;
  /** Profil de la crête, en unités de la vue 1200×1000. */
  appuis: number[];
  /** Part d'ombre de la terre, le reste est du papier. */
  sol: number;
  /** Part d'encre des pierres, le reste est du papier. */
  pierre: number;
  /** La teinte de l'arête : elle se fonce quand le plan se rapproche. */
  arete: string;
  /** Son retard à l'arrivée, en millisecondes. Le proche se pose en premier. */
  arrivee: number;
  cairns: { gauche: string; haut: string; pierres: number }[];
};

/**
 * Les deux plans, et la seule règle qui compte pour les placer : **ils vivent
 * tous les deux au-dessus du titre.**
 *
 * Ils étaient d'abord répartis de part et d'autre de lui, et deux défauts en
 * sortaient. Le haut du panneau restait vide sur près de la moitié de sa
 * hauteur — un blanc qui n'était pas un ciel, juste une zone où l'on avait
 * oublié de dessiner. Et la seconde ligne du titre est **évidée** : un cairn
 * posé derrière elle traverse les lettres, si bien que ni la pierre ni le mot
 * ne se lisaient. Les crêtes sont donc remontées au-dessus de la ligne de
 * titre, les cairns occupent la bande haute, et ce qui reste entre eux et le
 * sol est le terrain sur lequel la phrase se pose.
 *
 * **Le plan proche va d'un seul tenant de sa crête au bas du panneau.** Il
 * s'arrêtait à mi-course et laissait la place à une seconde teinte, celle du
 * sol d'ouverture : la butte se coupait donc en deux à une hauteur qu'aucune
 * arête ne justifiait, et l'œil cherchait le relief qui aurait dû aller avec.
 * Sa masse est maintenant l'ombre pleine, du haut de la butte jusqu'à la
 * jointure du panneau suivant — c'est le même terrain, il a donc la même
 * valeur.
 *
 * **Et elle ne porte rien d'autre que son arête.** On y a tracé des strates,
 * d'abord deux puis six : dans les deux cas la butte cessait d'être une masse
 * pour devenir un objet rayé. Ce qui donne sa matière au premier plan existe
 * déjà et n'a pas besoin d'être dessiné — c'est le grain, que chaque panneau
 * porte derrière son contenu, monté jusqu'à ce qu'il se sente sans se voir.
 *
 * La valeur descend donc de haut en bas en trois temps seulement : le ciel en
 * papier, une terre claire au lointain, la masse d'ombre au premier plan. Le
 * nombre de pierres baisse avec la distance — de loin, un empilement se lit à
 * sa masse et non à son compte —, et l'encre monte d'un plan à l'autre pour que
 * le lointain existe au lieu de s'effacer.
 *
 * Les crêtes sont franchement au-dessus de la ligne de titre, et pas seulement
 * au-dessus des lettres : à quelques points près, l'arête du plan médian venait
 * traverser « Tu lis beaucoup. » en son milieu — un trait qui coupe un mot se
 * lit comme une rayure, jamais comme un relief. Elles laissent maintenant la
 * hauteur d'un geste entre elles et le haut du titre.
 *
 * Le seul évitement horizontal restant est la colonne du cairn principal, à
 * droite : un empilement de fond planté juste derrière lui brouillerait la
 * seule chose que l'ouverture a à montrer.
 */
const PLANS: Plan[] = [
  {
    crete: 0.79,
    appuis: [0, -18, 8, -26, 4, -14, 6],
    sol: 18,
    pierre: 26,
    arete: "var(--arete-loin)",
    arrivee: 340,
    cairns: [
      { gauche: "4%", haut: "3.5%", pierres: 3 },
      { gauche: "15%", haut: "4.5%", pierres: 4 },
      { gauche: "25%", haut: "3%", pierres: 3 },
      { gauche: "36%", haut: "4%", pierres: 3 },
      { gauche: "47%", haut: "3.5%", pierres: 3 },
      { gauche: "58%", haut: "4.5%", pierres: 4 },
      { gauche: "71%", haut: "3%", pierres: 3 },
      { gauche: "86%", haut: "4%", pierres: 3 },
    ],
  },
  {
    crete: 0.68,
    appuis: [10, 22, -12, 16, -20, 10, -6],
    sol: 100,
    pierre: 46,
    arete: "var(--arete-proche)",
    arrivee: 100,
    cairns: [
      { gauche: "8%", haut: "6%", pierres: 4 },
      { gauche: "20%", haut: "7.5%", pierres: 5 },
      { gauche: "33%", haut: "5.5%", pierres: 4 },
      { gauche: "45%", haut: "7%", pierres: 5 },
      { gauche: "56%", haut: "5%", pierres: 4 },
      { gauche: "91%", haut: "6.5%", pierres: 5 },
    ],
  },
];

/**
 * Les mêmes plans, redessinés pour un écran de trois cent quatre-vingt-dix.
 *
 * Trois choses changent, et aucune n'est une mise à l'échelle.
 *
 * **Un. Les crêtes descendent sous le titre.** Sur deux colonnes, le terrain
 * peut occuper la bande haute parce que le titre a la sienne à gauche. Sur une
 * colonne il n'y a plus de « à côté » : le titre prend le haut, et tout ce
 * qu'on dessine derrière lui passe dedans. Le paysage se range donc sous la
 * phrase, dans le tiers bas, là où la seule chose à traverser est le cairn de
 * l'ouverture — et le traverser, ici, c'est le planter.
 *
 * **Deux. Les crêtes ondulent trois fois moins souvent.** La vue fait mille
 * deux cents unités de large quelle que soit la fenêtre : sept appuis, c'est
 * une ondulation tous les cent soixante-dix pixels sur un écran de bureau, et
 * tous les cinquante-cinq sur un téléphone. La même courbe y devient une
 * dentelure. Quatre appuis rendent au relief sa longueur d'onde, et l'amplitude
 * monte un peu pour compenser ce que l'écrasement horizontal a rendu plus raide.
 *
 * **Trois. Six cairns au lieu de quatorze, et ils s'écartent du milieu.** De
 * bureau, le paysage évite la colonne de droite parce que le cairn principal y
 * est ; sur téléphone il est au centre, donc c'est le centre qui se libère. Ce
 * qui reste tient en deux groupes qui l'encadrent — un sentier qui passe
 * derrière lui, ce que quatorze silhouettes larges de six pixels n'auraient pas
 * su dire.
 */
const PLANS_TELEPHONE: Plan[] = [
  {
    crete: 0.2,
    appuis: [0, -30, 12, -22],
    sol: 18,
    pierre: 26,
    arete: "var(--arete-loin)",
    arrivee: 340,
    cairns: [
      { gauche: "4%", haut: "4.5%", pierres: 3 },
      { gauche: "17%", haut: "5.5%", pierres: 4 },
      { gauche: "78%", haut: "5%", pierres: 3 },
      { gauche: "91%", haut: "4.5%", pierres: 3 },
    ],
  },
  {
    crete: 0.115,
    appuis: [14, -18, 26, -10],
    sol: 100,
    pierre: 46,
    arete: "var(--arete-proche)",
    arrivee: 100,
    cairns: [
      { gauche: "6%", haut: "7.5%", pierres: 4 },
      { gauche: "87%", haut: "7%", pierres: 5 },
    ],
  },
];

/**
 * Un cairn du paysage.
 *
 * `SilhouetteDeCairn` tire toujours les mêmes neuf pierres : posée treize fois
 * elle donnerait treize fois le même dessin, c'est-à-dire un motif répété — la
 * seule chose que ce composant-là s'interdit. Celui-ci prend sa graine, donc
 * aucun cairn du paysage n'est le même que son voisin.
 */
/** La crête d'un plan, dans la vue commune. */
const crete = (plan: Plan) => cheminDeCrete(1000 * (1 - plan.crete), plan.appuis);

function CairnDuPaysage({
  graine,
  pierres,
  teintes,
}: {
  graine: string;
  pierres: number;
  teintes: [string, string, string];
}) {
  const empilement = empiler(
    pierres,
    Array.from({ length: pierres }, (_, index) => `${graine}-${index}`),
  );

  return (
    <svg
      viewBox={`0 ${-empilement.hauteur + empilement.ySol} ${LARGEUR_VUE} ${empilement.hauteur}`}
      className="h-full w-auto"
      aria-hidden
    >
      {empilement.pierres.map((pierre) => (
        <g
          key={pierre.cle}
          transform={`translate(${pierre.x} ${pierre.y}) rotate(${pierre.rotation})`}
        >
          <path d={pierre.chemin} fill={teintes[pierre.nuance]} />
        </g>
      ))}
    </svg>
  );
}

/**
 * Un plan : ses cairns, puis sa terre par-dessus leurs pieds.
 *
 * L'ordre compte plus que le reste — c'est lui qui plante les pierres au lieu
 * de les poser. Le composant ne connaît ni la fenêtre ni le nombre de plans, il
 * dessine celui qu'on lui donne : c'est ce qui permet aux deux paysages, celui
 * de bureau et celui du téléphone, d'être deux jeux de valeurs et non deux
 * dessins à tenir en parallèle.
 */
function PlanDuPaysage({ plan, graine }: { plan: Plan; graine: string }) {
  return (
    <div
      className="montee-du-plan absolute inset-0"
      style={{ animationDelay: `${plan.arrivee}ms` }}
    >
      {plan.cairns.map((cairn, index) => (
        <div
          className="absolute"
          key={cairn.gauche}
          /* Le pied passe sous la crête : deux points de la hauteur du
             panneau suffisent à ce que la terre le recouvre. */
          style={{
            left: cairn.gauche,
            bottom: `${(plan.crete * 100 - 2).toFixed(1)}%`,
            height: cairn.haut,
          }}
        >
          <CairnDuPaysage
            graine={`${graine}-${index}`}
            pierres={cairn.pierres}
            teintes={teintesDe(plan.pierre)}
          />
        </div>
      ))}

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 1000"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path d={crete(plan).masse} fill={terre(plan.sol)} />
        {/* L'arête, sans quoi la butte n'existe pas.
            Deux terres voisines ne se séparent que de quelques centièmes de
            luminance : l'écart suffit à faire un plan, pas à faire une
            ligne, et le relief se devinait sans jamais se voir. Le trait la
            dessine. Il ne grossit pas avec la vue — elle est étirée en
            hauteur —, donc il reste le même cheveu partout, et sa teinte
            monte d'un cran quand le plan se rapproche. */}
        <path
          d={crete(plan).ligne}
          fill="none"
          stroke={plan.arete}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

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
