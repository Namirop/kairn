import type { Ablation, PhraseDecouverte, Retrait } from "./ablation";
import { MODELE_EMBEDDING } from "./espace";
import { PLANCHER_COUVERTURE } from "./seuils";

/**
 * Le rapport de l'épreuve par ablation.
 *
 * Un retrait qui ne découvre rien veut dire qu'un voisin le couvre (la mesure
 * est juste) ou qu'il ne portait rien (le produit est en cause). Les deux ne
 * se distinguent qu'à l'œil, d'où les textes en entier.
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
 * Un retrait sans effet, avec sa chute maximale : elle dit si la mesure n'a
 * pas bougé ou a bougé sans franchir le plancher.
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
 * En tête, la chute, pas le compte des franchissements : c'est elle qui prouve
 * la sensibilité. Les chutes atterrissent souvent au-dessus d'un plancher posé
 * pour une autre question, et compter les franchissements ferait croire à un
 * instrument sourd.
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
    "L'épreuve dit si la mesure réagit : chaque retrait doit déplacer la couverture. Elle ne contrôle pas le doublon : retirer un jumeau peut découvrir des phrases, et un concept redondant chute souvent plus qu'un concept distinct, car redondant entre concepts n'implique pas substituable au niveau de la phrase.",
    "",
    ...ablations.flatMap((ablation) => [...rendreUneAblation(ablation), "---", ""]),
  ].join("\n");
}
