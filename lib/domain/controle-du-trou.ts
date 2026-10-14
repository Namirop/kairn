import { termeDebordeSurLaPhrase } from "./bord-du-trou";
import type { VariantAControler } from "./controle-question";
import type { Manquement } from "./manquement";
import { motsNormalises } from "./mots-normalises";
import { TROU } from "./reponse-cloze";
import { trouDevoileSaReponse } from "./trou-devoile";

/**
 * Ce que son format impose à un texte à trou, contrôlé par étapes : le premier
 * manquement trouvé est le seul rendu.
 */

/** Le trou fait un à trois mots, jamais une proposition entière. */
export const MOTS_MAX_DU_TROU = 3;

type Cloze = NonNullable<VariantAControler["cloze"]>;

/**
 * Le texte à trou : un seul trou, et ce qui manque tient en trois mots.
 *
 * La longueur se mesure sur la première forme acceptée, le terme masqué. Un
 * trou plus long se reformule au lieu de se retrouver, et la comparaison
 * échoue sur une réponse juste.
 */
export function controlerCloze(variant: VariantAControler): Manquement[] {
  const cloze = variant.cloze ?? null;

  if (variant.format !== "CLOZE") {
    return cloze === null
      ? []
      : [{ regle: "trou", detail: `format ${variant.format} avec une phrase trouée` }];
  }

  if (cloze === null) {
    return [{ regle: "trou", detail: "un CLOZE sans phrase trouée ni formes acceptées" }];
  }

  const terme = (cloze.accepted[0] ?? "").trim();

  for (const etape of ETAPES_DU_TROU) {
    const detail = etape(cloze, terme);

    if (detail !== null) return [{ regle: "trou", detail }];
  }

  return [];
}

function unSeulTrou(cloze: Cloze): string | null {
  const trous = cloze.sentence.split(TROU).length - 1;

  return trous === 1 ? null : `${trous} trous dans la phrase, un seul attendu`;
}

function termeCourt(_cloze: Cloze, terme: string): string | null {
  const mots = terme.split(/\s+/).filter(Boolean);

  return mots.length === 0 || mots.length > MOTS_MAX_DU_TROU
    ? `le terme masqué fait ${mots.length} mots : « ${terme} »`
    : null;
}

/**
 * Un terme qui redit un mot posé contre le trou (« de ___ semaines », terme
 * « 52 semaines ») : « 52 », juste, serait compté faux. Réparé à la lecture par
 * `trouSansRedite` ; signalé pour que le banc dise si le prompt tient.
 */
function termeSansRedite(cloze: Cloze, terme: string): string | null {
  return termeDebordeSurLaPhrase(cloze.sentence, terme)
    ? `le terme masqué redit un mot qui borde le trou : « ${terme} »`
    : null;
}

/**
 * Un terme écrit en clair ailleurs dans sa propre phrase : le trou ne demande
 * plus que de recopier. La question marche mais ne teste plus rien, donc rien à
 * réparer à la lecture ; le signalement dit si la consigne du prompt tient.
 */
function termeCache(cloze: Cloze, terme: string): string | null {
  return trouDevoileSaReponse(cloze.sentence, terme)
    ? `le terme masqué est écrit ailleurs dans la phrase : « ${terme} »`
    : null;
}

/**
 * Un leurre qui est une forme acceptée met deux bonnes réponses dans l'aide.
 * Signalé sans refus : `pistesDuTrou` retire le doublon à l'affichage, mais un
 * modèle qui le fait souvent doit se voir au banc.
 */
function leurresFaux(cloze: Cloze): string | null {
  const acceptees = new Set(cloze.accepted.map((forme) => motsNormalises(forme)));
  const doublon = (cloze.leurres ?? []).find((leurre) => acceptees.has(motsNormalises(leurre)));

  return doublon === undefined ? null : `leurre accepté comme réponse : « ${doublon} »`;
}

/** Les contrôles du trou, dans l'ordre : le premier qui trouve à redire l'emporte. */
const ETAPES_DU_TROU: readonly ((cloze: Cloze, terme: string) => string | null)[] = [
  unSeulTrou,
  termeCourt,
  termeSansRedite,
  termeCache,
  leurresFaux,
];
