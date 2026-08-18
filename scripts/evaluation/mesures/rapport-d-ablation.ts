import type { Ablation, PhraseDecouverte, Retrait } from "./ablation";
import { MODELE_EMBEDDING } from "./espace";
import { PLANCHER_COUVERTURE } from "./seuils";

/**
 * Le rapport de l'épreuve par ablation.
 *
 * Il est écrit pour qu'on puisse **conclure** : le compte des retraits sans
 * effet en tête, parce que c'est là que se joue la question. Un retrait qui ne
 * découvre rien veut dire l'une de deux choses, et il faut lire le concept pour
 * savoir laquelle — soit un voisin le couvre entièrement, soit il ne portait
 * rien. La première réponse valide la mesure, la seconde accuse le produit.
 * Aucune des deux n'accuse l'instrument, mais elles ne se distinguent qu'à
 * l'œil, d'où les textes en entier.
 */

const EXTRAIT = 220;

/** Sous cet écart, un retrait n'a rien déplacé : les deux concepts se valent. */
const CHUTE_PLATE = 0.05;

function extrait(texte: string): string {
  const plat = texte.replace(/\s+/g, " ").trim();

  return plat.length > EXTRAIT ? `${plat.slice(0, EXTRAIT)}…` : plat;
}

function proximite(valeur: number): string {
  return valeur.toFixed(3);
}

/** La chute d'une phrase, avant et après, avec l'écart en clair. */
function rendreLaChute(chute: PhraseDecouverte): string {
  const ecart = (chute.avant - chute.apres).toFixed(3);

  return `${proximite(chute.avant)} → **${proximite(chute.apres)}** (−${ecart}) ${extrait(chute.texte)}`;
}

function rendreUnRetrait(retrait: Retrait): string[] {
  const lignes = [
    `- **${retrait.decouvertes.length}** découverte(s) · ${retrait.portees} phrase(s) portée(s) · ${extrait(retrait.concept)}`,
  ];

  for (const decouverte of retrait.decouvertes) lignes.push(`  - ${rendreLaChute(decouverte)}`);

  return [...lignes, ""];
}

/**
 * Un retrait sans effet, avec sa chute maximale.
 *
 * Sans cette ligne, on ne sait pas si la mesure n'a pas bougé ou si elle a bougé
 * sans franchir le plancher — et c'est toute la question de l'épreuve.
 */
function rendreUnRetraitSansEffet(retrait: Retrait): string[] {
  const chute =
    retrait.chuteMaximale === null
      ? "aucune phrase ne dépendait de lui"
      : `plus forte chute ${rendreLaChute(retrait.chuteMaximale)}`;

  return [
    `- ${retrait.portees} phrase(s) portée(s) · ${extrait(retrait.concept)}`,
    `  - ${chute}`,
    "",
  ];
}

/** Les chutes maximales d'une ablation, croissantes. */
function chutes(ablation: Ablation): number[] {
  return ablation.retraits
    .map((retrait) => retrait.chuteMaximale)
    .filter((chute): chute is PhraseDecouverte => chute !== null)
    .map((chute) => chute.avant - chute.apres)
    .sort((un, deux) => un - deux);
}

/**
 * En tête, la chute — pas le compte des franchissements de plancher.
 *
 * C'est la chute qui prouve la sensibilité, et c'est elle qu'il faut lire en
 * premier. Le premier relevé menait sur « 5 retraits sur 20 découvrent une
 * phrase » et laissait croire à un instrument sourd, alors que dix-neuf retraits
 * sur vingt déplaçaient la couverture de deux dixièmes : les chutes atterrissent
 * simplement entre 0,63 et 0,80, très au-dessus d'un plancher posé pour une
 * autre question. Un franchissement de plancher dépend du plancher ; une chute,
 * non.
 */
function rendreUneAblation(ablation: Ablation): string[] {
  const sansEffet = ablation.retraits.filter((retrait) => retrait.decouvertes.length === 0);
  const avecEffet = ablation.retraits.filter((retrait) => retrait.decouvertes.length > 0);
  const decouvertes = avecEffet.reduce((total, retrait) => total + retrait.decouvertes.length, 0);
  const mesurees = chutes(ablation);
  const plates = mesurees.filter((chute) => chute < CHUTE_PLATE).length;
  const mediane = mesurees[Math.floor(mesurees.length / 2)];

  const lignes = [
    `## ${ablation.nom}`,
    "",
    `${ablation.segments} segments · ${ablation.concepts} concepts · ${ablation.dejaSous} phrase(s) déjà sous le plancher avant tout retrait`,
    "",
    mesurees.length === 0
      ? "**Aucun retrait ne déplace la couverture.** Sur ce dépôt, l'ablation ne mesure rien."
      : `**${mesurees.length} retrait(s) sur ${ablation.retraits.length} déplacent la couverture** — chute médiane ${proximite(mediane ?? 0)}, de ${proximite(mesurees[0] ?? 0)} à ${proximite(mesurees.at(-1) ?? 0)}. ${plates} sous ${CHUTE_PLATE}, donc ${plates} concept(s) réellement interchangeable(s) avec un voisin.`,
    "",
    `Franchissements du plancher : ${avecEffet.length} retrait(s) découvrent ${decouvertes} phrase(s). Ce compte dépend du plancher, la chute non — c'est la ligne au-dessus qui dit si la mesure réagit.`,
    "",
  ];

  if (sansEffet.length > 0) {
    lignes.push(
      "### Les retraits sans effet",
      "",
      "Soit un concept voisin couvre déjà les mêmes phrases — la mesure est juste —, soit ce concept ne portait rien que le texte réclamait. La chute maximale départage : forte, la mesure a réagi et c'est le plancher qui est plus bas que l'écart ; nulle ou infime, deux concepts sont interchangeables aux yeux de la géométrie.",
      "",
      ...sansEffet.flatMap(rendreUnRetraitSansEffet),
    );
  }

  if (avecEffet.length > 0) {
    lignes.push(
      "### Les retraits qui découvrent",
      "",
      "Le nombre est celui des phrases qui passent sous le plancher, puis chacune avec sa proximité avant et après.",
      "",
      ...avecEffet.flatMap(rendreUnRetrait),
    );
  }

  return lignes;
}

export function rendreLAblation(
  ablations: Ablation[],
  entete: { emisA: Date; source: string; dimension: number },
): string {
  return [
    `# Épreuve de l'instrument par ablation — ${entete.emisA.toISOString().slice(0, 16).replace("T", " ")} UTC`,
    "",
    `\`${MODELE_EMBEDDING}\` · ${entete.dimension} dimensions · plancher de couverture ${PLANCHER_COUVERTURE} · ${entete.source}`,
    "",
    "On retire un concept, on recalcule la couverture, on regarde si les phrases qui s'appuyaient sur lui tombent sous le plancher. Rien n'est plongé : tout vient du cache, l'épreuve ne coûte rien et se rejoue à volonté.",
    "",
    "Deux lectures opposées, et il faut les deux. Sur un dépôt sain, un retrait **doit** découvrir des phrases. Sur un dépôt à jumeaux, retirer un jumeau ne **doit pas** en découvrir — son double couvre les mêmes phrases, et c'est le signal de doublon vu de l'autre côté.",
    "",
    ...ablations.flatMap((ablation) => [...rendreUneAblation(ablation), "---", ""]),
  ].join("\n");
}
