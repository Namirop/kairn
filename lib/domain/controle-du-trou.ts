import { termeDebordeSurLaPhrase } from "./bord-du-trou";
import type { VariantAControler } from "./controle-question";
import type { Manquement } from "./manquement";
import { motsNormalises } from "./mots-normalises";
import { TROU } from "./reponse-cloze";
import { trouDevoileSaReponse } from "./trou-devoile";

/** Ce que son format impose à un texte à trou ; seul le premier manquement est rendu. */

/**
 * Un trou plus long se reformule au lieu de se retrouver, et la comparaison
 * échoue sur une réponse juste.
 */
export const MOTS_MAX_DU_TROU = 3;

type Cloze = NonNullable<VariantAControler["cloze"]>;

/** La longueur se mesure sur la première forme acceptée, le terme masqué. */
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
 * « de ___ semaines », terme « 52 semaines » : « 52 », juste, serait compté
 * faux. Réparé à la lecture par `trouSansRedite`, signalé pour le banc.
 */
function termeSansRedite(cloze: Cloze, terme: string): string | null {
  return termeDebordeSurLaPhrase(cloze.sentence, terme)
    ? `le terme masqué redit un mot qui borde le trou : « ${terme} »`
    : null;
}

/**
 * Le terme écrit ailleurs dans la phrase : il suffit de recopier. Rien à réparer
 * à la lecture, le signalement sert au banc.
 */
function termeCache(cloze: Cloze, terme: string): string | null {
  return trouDevoileSaReponse(cloze.sentence, terme)
    ? `le terme masqué est écrit ailleurs dans la phrase : « ${terme} »`
    : null;
}

/**
 * Un leurre accepté met deux bonnes réponses dans l'aide. `pistesDuTrou` le
 * retire à l'affichage ; signalé pour que le banc voie un modèle qui récidive.
 */
function leurresFaux(cloze: Cloze): string | null {
  const acceptees = new Set(cloze.accepted.map((forme) => motsNormalises(forme)));
  const doublon = (cloze.leurres ?? []).find((leurre) => acceptees.has(motsNormalises(leurre)));

  return doublon === undefined ? null : `leurre accepté comme réponse : « ${doublon} »`;
}

const ETAPES_DU_TROU: readonly ((cloze: Cloze, terme: string) => string | null)[] = [
  unSeulTrou,
  termeCourt,
  termeSansRedite,
  termeCache,
  leurresFaux,
];
