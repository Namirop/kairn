import type { LangueDuProduit } from "@/lib/domain/langue-du-produit";
import type { DepotEvalue } from "./execution";
import { langueApparente } from "./langue-apparente";

/**
 * Les concepts et les étalons sortent-ils dans la langue de la personne, quoi
 * qu'elle ait déposé ?
 *
 * Ce contrôle existe parce qu'il a manqué. `18-anglais.txt` a rendu quatre
 * concepts en français, et le banc l'a classé « ok, 0 manquement » : aucun
 * contrôle automatique ne regardait la langue. Le fichier rendait le bug
 * reproductible, il ne le rendait pas visible.
 *
 * **Il mesurait la mauvaise chose jusqu'au 9 septembre 2026.** Il comparait la
 * sortie à la langue que le modèle avait *déclarée*, du temps où la consigne
 * était « écris dans la langue du dépôt ». Un dépôt espagnol rendant des
 * concepts espagnols et déclarant `es` était donc cohérent avec lui-même, et
 * ressortait « ok » — c'est exactement ce qui est arrivé en production sur une
 * explication de `ser` et `estar`. Un contrôle qui prend sa référence dans la
 * sortie qu'il examine ne contrôle rien.
 *
 * La référence est maintenant une constante : le produit ne parle que français,
 * donc les concepts et les étalons sont en français, sans condition. Ce que le
 * dépôt était n'entre plus dans le verdict — seulement dans le libellé, pour
 * dire d'où venait le glissement.
 *
 * **Deux mesures, et pas trois.** Les énoncés ne sont volontairement pas
 * mesurés : le texte cité garde sa langue, et un texte à trou peut légitimement
 * masquer un mot dans la phrase d'exemple citée telle quelle. Sur une liste de
 * six expressions anglaises, ces phrases pèseraient plus lourd que le français
 * qui les entoure, et le contrôle crierait au loup sur une sortie juste. Les
 * étalons, eux, sont du texte porteur de bout en bout — ils expliquent, ils ne
 * citent qu'en passant. C'est l'invariant propre, et il suffit : les vingt-quatre
 * questions anglaises du 09/09 avaient des étalons anglais.
 *
 * **Ce qui est cité est retiré avant de compter.** C'est la contrepartie exacte
 * de la règle : le texte cité garde sa langue, donc il ne peut pas servir à juger
 * celle du texte porteur. Sans ça, les six concepts français d'une liste
 * d'expressions anglaises — « L'expression anglaise « to put up with » signifie
 * « supporter » » — se lisaient `en`, parce que `to`, `with`, `of` et `for`
 * comptent pour l'anglais pendant que le français qui les entoure n'apporte aucun
 * des mots-outils de la liste. Le contrôle aurait crié sur la sortie qu'on veut.
 *
 * Retirer les citations peut passer sous le minimum de mots de
 * `langueApparente` : elle se tait alors, et c'est le bon comportement. Sur les
 * six cas relevés en production — les trois défauts et les trois sorties
 * attendues à leur place —, les concepts et les étalons se rangent du bon côté.
 *
 * **Depuis le 08/10/2026, la référence est la langue de la personne**, et non
 * plus le français. Elle reste une donnée extérieure à la sortie — lue sur le
 * nom du dépôt, voir `langueDuDepot` —, donc le contrôle garde la propriété qui
 * le rend utile : il ne prend pas sa référence dans ce qu'il examine.
 */

const CODE: Record<LangueDuProduit, string> = { FR: "fr", EN: "en" };
const NOM: Record<LangueDuProduit, string> = { FR: "du français", EN: "de l'anglais" };

/**
 * Ce que la règle exempte, donc ce qui ne peut pas servir à la vérifier.
 *
 * L'apostrophe droite n'ouvre rien ici : `l'identité` en poserait deux, et le
 * texte français se ferait dévorer entre elles.
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
