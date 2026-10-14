import type { LangueDuProduit } from "@/lib/domain/langue-du-produit";
import type { DepotEvalue } from "./execution";
import { langueApparente } from "./langue-apparente";

/**
 * Les concepts et les étalons sortent-ils dans la langue de la personne, quoi
 * qu'elle ait déposé ?
 *
 * La référence est la langue de la personne, lue sur le nom du dépôt
 * (`langueDuDepot`), jamais une langue que le modèle déclare : un contrôle qui
 * prend sa référence dans la sortie qu'il examine ne contrôle rien — un dépôt
 * espagnol rendu en espagnol et déclaré `es` passerait pour cohérent. La
 * langue apparente du dépôt n'entre que dans le libellé, pour dire d'où vient
 * le glissement.
 *
 * Les énoncés ne sont pas mesurés : le texte cité y garde sa langue, et un
 * texte à trou peut masquer un mot d'une phrase citée telle quelle. Les
 * étalons, eux, sont du texte porteur de bout en bout ; ils suffisent.
 *
 * Ce qui est cité est retiré avant de compter, puisque sa langue est exemptée.
 * Sans ça, « L'expression anglaise « to put up with » signifie « supporter » »
 * se lit `en` : `to`, `with`, `for` comptent pour l'anglais, et le français
 * autour n'apporte aucun mot-outil. Si le retrait passe sous le minimum de
 * `langueApparente`, elle se tait, et c'est voulu.
 */

const CODE: Record<LangueDuProduit, string> = { FR: "fr", EN: "en" };
const NOM: Record<LangueDuProduit, string> = { FR: "du français", EN: "de l'anglais" };

/**
 * Ce que la règle exempte, donc ce qui ne peut pas servir à la vérifier.
 * L'apostrophe droite n'ouvre rien : `l'identité` en poserait deux, et le
 * français se ferait dévorer entre elles.
 */
const CITATIONS = /«[^»]*»|“[^”]*”|"[^"]*"|`[^`]*`|‘[^’]*’/g;

function textePorteur(textes: string[]): string {
  return textes.join(" ").replace(CITATIONS, " ");
}

export function manquementsDeLangue(evaluation: DepotEvalue): string[] {
  if (evaluation.echec) return [];

  const attendue = CODE[evaluation.langue];
  const duDepot = langueApparente(evaluation.texte);
  const provenance =
    duDepot && duDepot !== attendue ? `, sur un dépôt qui paraît en \`${duDepot}\`` : "";

  const ecrits = (quoi: string, textes: string[]): string[] => {
    const langue = langueApparente(textePorteur(textes));

    if (!langue || langue === attendue) return [];

    return [`${quoi} sont écrits en \`${langue}\` au lieu ${NOM[evaluation.langue]}${provenance}`];
  };

  return [
    ...ecrits(
      "les concepts",
      evaluation.concepts.map((concept) => concept.concept.concept),
    ),
    ...ecrits(
      "les réponses-étalons",
      evaluation.concepts.flatMap((concept) =>
        concept.variants.map((variant) => variant.answerKey),
      ),
    ),
  ];
}
